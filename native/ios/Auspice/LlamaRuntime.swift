import Foundation
#if canImport(llama)
import llama
#endif

/// llama.cpp, held open between questions.
///
/// Loading a model is the slow part — a second or two even from the phone's
/// own storage — so the model stays resident once it has been used, and the
/// context is reset between conversations rather than rebuilt. Everything
/// happens on one serial queue: llama.cpp's context is not safe to touch from
/// two places at once.
final class Runtime {
    static let shared = Runtime()

    enum Failure: LocalizedError {
        case unavailable
        case loadFailed(String)

        var errorDescription: String? {
            switch self {
            case .unavailable: t("downloaded.unavailable")
            case .loadFailed(let why): why
            }
        }
    }

    private let queue = DispatchQueue(label: "art.lazying.auspice.llama", qos: .userInitiated)
    private var loadedId: String?

    #if canImport(llama)
    private var model: OpaquePointer?
    private var context: OpaquePointer?
    private var sampler: UnsafeMutablePointer<llama_sampler>?
    #endif

    private init() {}

    var isLoaded: Bool { loadedId != nil }

    func unload() {
        queue.sync {
            #if canImport(llama)
            if let sampler { llama_sampler_free(sampler) }
            if let context { llama_free(context) }
            if let model { llama_model_free(model) }
            sampler = nil
            context = nil
            model = nil
            #endif
            loadedId = nil
        }
    }

    /// Brings a downloaded model up. Safe to call again; it does nothing if
    /// that model is already the one in memory.
    func load(_ choice: DownloadedModel.Choice) throws {
        #if canImport(llama)
        try queue.sync {
            if loadedId == choice.id { return }
            unloadLocked()

            llama_backend_init()
            var modelParams = llama_model_default_params()
            // Metal does the work; the whole of a model this size fits.
            modelParams.n_gpu_layers = 99 // the whole of a model this size fits on the GPU

            let path = DownloadedModel.file(for: choice).path
            guard let loaded = llama_model_load_from_file(path, modelParams) else {
                throw Failure.loadFailed(t("downloaded.loadFailed"))
            }
            model = loaded

            var contextParams = llama_context_default_params()
            contextParams.n_ctx = UInt32(choice.contextTokens)
            contextParams.n_batch = 512
            contextParams.n_threads = Int32(max(2, min(4, ProcessInfo.processInfo.activeProcessorCount - 2)))
            contextParams.n_threads_batch = contextParams.n_threads
            guard let made = llama_init_from_model(loaded, contextParams) else {
                llama_model_free(loaded)
                model = nil
                throw Failure.loadFailed(t("downloaded.loadFailed"))
            }
            context = made

            var samplerParams = llama_sampler_chain_default_params()
            samplerParams.no_perf = true
            let chain = llama_sampler_chain_init(samplerParams)
            llama_sampler_chain_add(chain, llama_sampler_init_top_k(40))
            llama_sampler_chain_add(chain, llama_sampler_init_top_p(0.95, 1))
            llama_sampler_chain_add(chain, llama_sampler_init_temp(0.7))
            llama_sampler_chain_add(chain, llama_sampler_init_dist(UInt32.random(in: 1...UInt32.max)))
            sampler = chain

            loadedId = choice.id
        }
        #else
        throw Failure.unavailable
        #endif
    }

    private func unloadLocked() {
        #if canImport(llama)
        if let sampler { llama_sampler_free(sampler) }
        if let context { llama_free(context) }
        if let model { llama_model_free(model) }
        sampler = nil
        context = nil
        model = nil
        #endif
        loadedId = nil
    }

    /// Writes an answer, a token at a time.
    ///
    /// `onToken` is called on the main queue so the view can append straight
    /// to the log; generation itself stays on the runtime's own queue.
    func answer(
        system: String,
        user: String,
        maximumTokens: Int = 600,
        onToken: @escaping (String) -> Void
    ) async throws {
        #if canImport(llama)
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async { [weak self] in
                guard let self, let context = self.context, let model = self.model, let sampler = self.sampler else {
                    continuation.resume(throwing: Failure.unavailable)
                    return
                }
                let vocab = llama_model_get_vocab(model)
                let prompt = Self.applyTemplate(model: model, system: system, user: user)

                // Start from an empty context every time: the app already sends
                // the history it wants remembered, and a stale KV cache is how
                // a small model starts answering the previous question.
                llama_memory_clear(llama_get_memory(context), true)

                var tokens = [llama_token](repeating: 0, count: prompt.utf8.count + 16)
                let count = prompt.withCString { pointer in
                    llama_tokenize(vocab, pointer, Int32(strlen(pointer)), &tokens, Int32(tokens.count), true, true)
                }
                guard count > 0 else {
                    continuation.resume(throwing: Failure.loadFailed(t("downloaded.loadFailed")))
                    return
                }
                tokens = Array(tokens.prefix(Int(count)))

                var batch = llama_batch_init(Int32(max(tokens.count, 1)), 0, 1)
                defer { llama_batch_free(batch) }
                Self.fill(&batch, with: tokens)
                if llama_decode(context, batch) != 0 {
                    continuation.resume(throwing: Failure.loadFailed(t("downloaded.loadFailed")))
                    return
                }

                var produced = 0
                var buffer = [CChar](repeating: 0, count: 256)
                while produced < maximumTokens {
                    let next = llama_sampler_sample(sampler, context, -1)
                    if llama_vocab_is_eog(vocab, next) { break }

                    let written = llama_token_to_piece(vocab, next, &buffer, Int32(buffer.count), 0, true)
                    if written > 0 {
                        let piece = String(decoding: buffer[0..<Int(written)].map { UInt8(bitPattern: $0) }, as: UTF8.self)
                        DispatchQueue.main.async { onToken(piece) }
                    }

                    Self.fill(&batch, with: [next], startingAt: Int32(tokens.count + produced))
                    if llama_decode(context, batch) != 0 { break }
                    produced += 1
                }
                continuation.resume()
            }
        }
        #else
        throw Failure.unavailable
        #endif
    }

    #if canImport(llama)
    private static func fill(_ batch: inout llama_batch, with tokens: [llama_token], startingAt start: Int32 = 0) {
        batch.n_tokens = Int32(tokens.count)
        for (offset, token) in tokens.enumerated() {
            batch.token[offset] = token
            batch.pos[offset] = start + Int32(offset)
            batch.n_seq_id[offset] = 1
            batch.seq_id[offset]![0] = 0
            batch.logits[offset] = offset == tokens.count - 1 ? 1 : 0
        }
    }

    /// Uses the model's own chat template where it has one, so a Gemma file and
    /// a Qwen file are each addressed the way they expect.
    private static func applyTemplate(model: OpaquePointer, system: String, user: String) -> String {
        let template = llama_model_chat_template(model, nil)
        guard template != nil else {
            return "\(system)\n\n\(user)\n"
        }
        var buffer = [CChar](repeating: 0, count: 64 * 1024)
        return system.withCString { systemText in
            user.withCString { userText in
                var messages = [
                    llama_chat_message(role: strdup("system"), content: systemText),
                    llama_chat_message(role: strdup("user"), content: userText),
                ]
                defer { messages.forEach { free(UnsafeMutableRawPointer(mutating: $0.role)) } }
                let written = llama_chat_apply_template(template, &messages, messages.count, true, &buffer, Int32(buffer.count))
                guard written > 0 else { return "\(system)\n\n\(user)\n" }
                return String(cString: buffer)
            }
        }
    }
    #endif
}
