import SwiftUI

/// Result snapshots and drafts remain local. Cameras and loading tasks never
/// enter this store. Keeping the old WebView storage makes rollback lossless.
enum PracticeStorage {
    static func read<Value: Decodable>(_ key: String, default fallback: Value) -> Value {
        guard let data = UserDefaults.standard.data(forKey: "native.practice." + key),
              let value = try? JSONDecoder().decode(Value.self, from: data) else { return fallback }
        return value
    }
    static func write<Value: Encodable>(_ value: Value, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        UserDefaults.standard.set(data, forKey: "native.practice." + key)
    }
}

@propertyWrapper struct SavedPractice<Value: Codable>: DynamicProperty {
    private let key: String
    @State private var value: Value
    init(wrappedValue: Value, _ key: String) {
        self.key = key
        _value = State(initialValue: PracticeStorage.read(key, default: wrappedValue))
    }
    var wrappedValue: Value {
        get { value }
        nonmutating set { value = newValue; PracticeStorage.write(newValue, key: key) }
    }
    var projectedValue: Binding<Value> {
        Binding(get: { wrappedValue }, set: { wrappedValue = $0 })
    }
}
