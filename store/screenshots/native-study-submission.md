# Native study screenshots — September 29, 2026

These images show the actual SwiftUI application from source `362f187`, matching
LazyOracle iOS 1.0.0 (20). They were captured with XCTest on dedicated iOS 26.3
simulators, without replacing the interface or generating reading content.

| Folder | Device | Dimensions | Store family |
| --- | --- | --- | --- |
| `native-study-iphone-en` | iPhone 17 Pro Max | 1320 × 2868 | 6.9-inch (`APP_IPHONE_67`) |
| `native-study-iphone-zh` | iPhone 17 Pro Max | 1320 × 2868 | 6.9-inch (`APP_IPHONE_67`) |
| `native-study-ipad-en` | iPad Pro 13-inch (M5) | 2064 × 2752 | 13-inch (`APP_IPAD_PRO_3GEN_129`) |
| `native-study-ipad-zh` | iPad Pro 13-inch (M5) | 2064 × 2752 | 13-inch (`APP_IPAD_PRO_3GEN_129`) |

Each set contains, in order: home, interactive line changes, saved original with
personal notes, and figure comparison/related transformations. English and
Simplified Chinese use separate real notebook entries. The short notes are
nonpersonal demonstration text entered through the native controls. Date
formatting follows the simulator's system locale.

The capture test is `AuspiceUITests.testStoreStudyScreenshots`. Run it on an empty
project-owned simulator. It saves the computed result and notes through the UI.
An early Chinese capture retained English sample notes; that capture was excluded
from the submission and the fixture was corrected to use separate originals.

All submitted PNGs are RGB, at their original device resolution. Source checksum,
Apple processing status and upload order are verified before formal submission.
The raw XCTest bundles and attachment manifests are private under
`.runtime/formal-20260929/` locally and `~/Projects/Auspice/release/` on the Mac.

Apple's accepted dimensions are documented in
[screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
API family names retain older display names; they are the existing accepted
families in App Store Connect.
