# Add the native UI regression target to a working project (idempotent).
require 'xcodeproj'
project = Xcodeproj::Project.open(ARGV.fetch(0))
app = project.targets.find { |t| t.name == 'Auspice' }
target = project.targets.find { |t| t.name == 'AuspiceUITests' } || project.new_target(:ui_test_bundle, 'AuspiceUITests', :ios, '17.0')
unless target.dependencies.any? { |d| d.target == app }
  target.add_dependency(app)
end
group = project.main_group.find_subpath('AuspiceUITests', true)
group.set_source_tree('<group>'); group.set_path('AuspiceUITests')
file = group.files.find { |f| f.path == 'AuspiceUITests.swift' } || group.new_file('AuspiceUITests.swift')
target.source_build_phase.add_file_reference(file) unless target.source_build_phase.files_references.include?(file)
target.build_configurations.each do |config|
  config.build_settings.merge!('PRODUCT_NAME' => '$(TARGET_NAME)', 'TEST_TARGET_NAME' => 'Auspice', 'PRODUCT_BUNDLE_IDENTIFIER' => 'art.lazying.auspice.uitests', 'GENERATE_INFOPLIST_FILE' => 'YES', 'SWIFT_VERSION' => '5.0', 'TARGETED_DEVICE_FAMILY' => '1,2')
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.set_launch_target(app)
scheme.save_as(project.path, 'AuspiceValidation', true)
