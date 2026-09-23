import SwiftUI

struct AnswersScreen: View {
    @State private var book = "answers"
    @State private var question = ""
    @State private var opening: BookOpening?
    @State private var open = false
    @State private var error: String?

    var body: some View {
        ScreenScaffold(
            eyebrow: t("practice.answers"),
            title: t("answers.title"),
            tagline: t("answers.tagline")
        ) {
            Panel {
                FlowRow(spacing: 8) {
                    Chip(label: t("practice.answers"), active: book == "answers") { book = "answers" }
                    Chip(label: "Book of Questions", detail: "问题之书", active: book == "questions") { book = "questions" }
                }
                FieldLabel(t("answers.whatAsking"))
                TextField("", text: $question, axis: .vertical)
                    .textFieldStyle(AuspiceFieldStyle())
                    .lineLimit(1...4)
                Button(action: turn) {
                    Label(t("answers.title"), systemImage: "book")
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.top, 6)
            }

            if let error {
                Panel(title: t("common.notComputed")) {
                    Text(error).font(Typeface.serif(16)).foregroundStyle(Palette.inkSoft)
                }
            }

            if let opening {
                page(opening)
                    .rotation3DEffect(.degrees(open ? 0 : 92), axis: (x: 1, y: 0, z: 0), anchor: .top, perspective: 0.5)
                    .opacity(open ? 1 : 0)
            }
        }
    }

    private func page(_ opening: BookOpening) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("\(t("answers.page")) \(opening.page.number)")
                .font(Typeface.sans(11, weight: .bold))
                .tracking(2.4)
                .foregroundStyle(Color(hex: 0x8A6A22))
            Text(opening.page.en)
                .font(Typeface.display(27))
                .foregroundStyle(Color(hex: 0x2A1E06))
                .fixedSize(horizontal: false, vertical: true)
            Text(opening.page.zh)
                .font(Typeface.serif(21))
                .foregroundStyle(Color(hex: 0x5A4413))
                .fixedSize(horizontal: false, vertical: true)
            if !opening.question.isEmpty {
                Divider().overlay(Color(hex: 0x8A6A22).opacity(0.3))
                Text(opening.question)
                    .font(Typeface.serif(16))
                    .italic()
                    .foregroundStyle(Color(hex: 0x6B4E16))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(22)
        .background(
            LinearGradient(colors: [Palette.parchment, Color(hex: 0xE9DBB9)], startPoint: .top, endPoint: .bottom)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: .black.opacity(0.4), radius: 14, y: 8)
    }

    private func turn() {
        do {
            var input: [String: Any] = ["book": book]
            if !question.trimmingCharacters(in: .whitespaces).isEmpty { input["question"] = question }
            open = false
            let result = try Engines.shared.evaluate("book.open", input, as: BookOpening.self)
            error = nil
            opening = result
            withAnimation(.spring(response: 0.7, dampingFraction: 0.8)) { open = true }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
