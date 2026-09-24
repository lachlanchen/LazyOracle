# Both identities compile exactly the same native target and source files.
require 'xcodeproj'
project = Xcodeproj::Project.open(ARGV.fetch(0))
app = project.targets.find { |t| t.name == 'Auspice' }
app_group = project.main_group.find_subpath('Auspice', false)
['Debug', 'Release'].each do |base|
  name = "LazyOracle #{base}"
  ([project] + project.targets).each do |owner|
    original = owner.build_configurations.find { |c| c.name == base }
    config = owner.add_build_configuration(name, base.downcase.to_sym)
    config.build_settings = Marshal.load(Marshal.dump(original.build_settings))
  end
  app.build_configurations.find { |c| c.name == name }.build_settings.merge!(
    'PRODUCT_BUNDLE_IDENTIFIER' => 'art.lazying.lazyoracle',
    'APP_DISPLAY_NAME' => 'LazyOracle',
    'CURRENT_PROJECT_VERSION' => '16', 'MARKETING_VERSION' => '1.0.0',
    'PROVISIONING_PROFILE_SPECIFIER' => 'LazyOracle App Store 1',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'LazyOracleIcon'
  )
end
app.build_configurations.select { |c| ['Debug', 'Release'].include?(c.name) }.each do |config|
  config.build_settings['APP_DISPLAY_NAME'] = 'Auspice'
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.set_launch_target(app)
scheme.launch_action.build_configuration = 'LazyOracle Debug'
scheme.test_action.build_configuration = 'LazyOracle Debug'
scheme.analyze_action.build_configuration = 'LazyOracle Debug'
scheme.profile_action.build_configuration = 'LazyOracle Release'
scheme.archive_action.build_configuration = 'LazyOracle Release'
scheme.save_as(project.path, 'LazyOracle', true)
test = project.targets.find { |t| t.name == 'AuspiceUITests' }
if test
  scheme.add_build_target(test)
  scheme.add_test_target(test)
  scheme.save_as(project.path, 'LazyOracleValidation', true)
end
