#!/usr/bin/env ruby
# Run on a Mac with the existing xcodeproj gem. Shares all production SwiftUI
# files by reference; neither a second screen tree nor copied engine source.
require 'xcodeproj'
root = File.expand_path('..', __dir__)
path = File.join(root, 'native/macos/LazyOracle.xcodeproj')
project = Xcodeproj::Project.new(path)
target = project.new_target(:application, 'LazyOracle', :osx, '14.0')
shared = project.main_group.new_group('Shared', '../ios/Auspice')
Dir.glob(File.join(root, 'native/ios/Auspice/**/*.swift')).sort.each do |file|
  ref = shared.new_file(file.delete_prefix(File.join(root, 'native/ios/Auspice/')))
  target.source_build_phase.add_file_reference(ref)
end
mac = project.main_group.new_group('Desktop', '.')
Dir.glob(File.join(root, 'native/macos/*.swift')).sort.each do |file|
  target.source_build_phase.add_file_reference(mac.new_file(File.basename(file)))
end
resources = project.main_group.new_group('Resources', 'Resources')
%w[lazyoracle-engines.js auspice-content.json Vision].each do |name|
  ref = resources.new_file(name)
  ref.last_known_file_type = 'folder' if name == 'Vision'
  target.resources_build_phase.add_file_reference(ref)
end
icon = mac.new_file('Assets.xcassets')
target.resources_build_phase.add_file_reference(icon)
target.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'art.lazying.lazyoracle',
    'PRODUCT_NAME' => 'LazyOracle', 'MARKETING_VERSION' => '1.0.0', 'CURRENT_PROJECT_VERSION' => '1',
    'SWIFT_VERSION' => '5.0', 'SDKROOT' => 'macosx', 'MACOSX_DEPLOYMENT_TARGET' => '14.0',
    'INFOPLIST_FILE' => 'Info.plist', 'GENERATE_INFOPLIST_FILE' => 'NO',
    'CODE_SIGN_ENTITLEMENTS' => 'LazyOracle.entitlements', 'ENABLE_HARDENED_RUNTIME' => 'YES',
    'CODE_SIGN_STYLE' => 'Automatic', 'CODE_SIGN_IDENTITY' => '-',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon', 'COMBINE_HIDPI_IMAGES' => 'YES',
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/../Frameworks'],
  })
end
tests = project.new_target(:ui_test_bundle, 'DesktopUITests', :osx, '14.0')
tests.add_dependency(target)
test_group = project.main_group.new_group('Tests', 'Tests')
tests.source_build_phase.add_file_reference(test_group.new_file('DesktopUITests.swift'))
tests.build_configurations.each do |config|
  config.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'art.lazying.lazyoracle.macuitests',
    'SWIFT_VERSION' => '5.0', 'GENERATE_INFOPLIST_FILE' => 'YES',
    'TEST_TARGET_NAME' => 'LazyOracle', 'CODE_SIGN_IDENTITY' => '-',
    'CODE_SIGN_STYLE' => 'Automatic',
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.add_test_target(tests)
scheme.save_as(path, 'LazyOracle', true)
puts path
