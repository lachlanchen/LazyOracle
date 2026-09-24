import SwiftUI
import UIKit
import Capacitor

/// Keep the original native app's SwiftUI scene lifecycle even though its
/// content is now the classic interface. iOS can restore an archived
/// SwiftUI.AppSceneDelegate after an in-place update; a UIKit-only entry point
/// leaves that delegate without a scene graph and traps during restoration.
@main
struct ClassicApplication: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    var body: some Scene {
        WindowGroup {
            ClassicRootController()
                .ignoresSafeArea()
                .preferredColorScheme(.dark)
        }
    }
}

private struct ClassicRootController: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ClassicBridgeViewController {
        ClassicBridgeViewController()
    }
    func updateUIViewController(_ controller: ClassicBridgeViewController, context: Context) {}
}

class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        true
    }
}
