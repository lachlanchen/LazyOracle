import SwiftUI

/// What the conversation asks the app to show.
///
/// A reading often needs something the chat cannot compute on its own: a hand
/// or a face has to be in front of the camera. When the model calls
/// `read_palm` or `read_face`, this is how the request reaches the interface —
/// the root view watches it and pushes the screen, and the measurements the
/// reader then takes come back here for the next tool call to find.
@Observable
final class Router {
    static let shared = Router()

    /// Set by a tool call; cleared once the screen has been pushed.
    var requested: Practice?

    /// The last measurements taken on each camera screen, so the conversation
    /// can read them without asking the reader to do it twice.
    var palm: PalmFeatures?
    var face: FaceFeatures?

    private init() {}

    func show(_ practice: Practice) {
        requested = practice
    }
}
