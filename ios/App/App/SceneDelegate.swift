import UIKit
import Capacitor

/// Retained for UIKit scene sessions created by classic builds 10–11. New
/// sessions use ClassicApplication, while these existing sessions remain valid.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ClassicBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

class ClassicBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeArchivePlugin())
    }
}

/// Read-only upgrade bridge; original preferences and chat files remain intact.
@objc(NativeArchivePlugin)
class NativeArchivePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "NativeArchivePlugin"
    let jsName = "NativeArchive"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise)]
    @objc func read(_ call: CAPPluginCall) {
        guard Bundle.main.bundleIdentifier == "art.lazying.auspice" else { call.resolve([:]); return }
        var result: [String: Any] = ["platform": "ios"]
        if let profile = UserDefaults.standard.data(forKey: "auspice.profile") {
            result["profile"] = String(data: profile, encoding: .utf8)
        }
        result["language"] = UserDefaults.standard.string(forKey: "auspice.language")
        let file = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Auspice/conversations.json")
        if FileManager.default.fileExists(atPath: file.path) {
            do { result["chats"] = try String(contentsOf: file, encoding: .utf8) }
            catch { call.reject("Could not read the saved native archive"); return }
        }
        call.resolve(result)
    }
}
