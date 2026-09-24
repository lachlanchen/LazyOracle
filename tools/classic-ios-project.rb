# Auspice carries the maintained classic/PWA interface; old LazyOracle configs
# remain reproducible for rollback. Both identities use the same web source.
require 'xcodeproj'
project = Xcodeproj::Project.open(ARGV.fetch(0))
app = project.targets.find { |t| t.name == 'App' }
app.build_configurations.select { |c| ['Debug', 'Release'].include?(c.name) }.each { |c| c.build_settings['APP_DISPLAY_NAME'] = 'LazyOracle' }
['Debug', 'Release'].each do |base|
  name = "Auspice #{base}"
  ([project] + project.targets).each do |owner|
    original = owner.build_configurations.find { |c| c.name == base }
    config = owner.add_build_configuration(name, base.downcase.to_sym)
    config.build_settings = Marshal.load(Marshal.dump(original.build_settings))
    config.base_configuration_reference = original.base_configuration_reference
  end
  app.build_configurations.find { |c| c.name == name }.build_settings.merge!(
    'PRODUCT_BUNDLE_IDENTIFIER' => 'art.lazying.auspice',
    'APP_DISPLAY_NAME' => 'Auspice', 'CURRENT_PROJECT_VERSION' => '10',
    'MARKETING_VERSION' => '0.1.0',
    'PROVISIONING_PROFILE_SPECIFIER' => base == 'Release' ? 'Auspice App Store' : '',
    'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AuspiceIcon'
  )
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.set_launch_target(app)
scheme.launch_action.build_configuration = 'Auspice Debug'
scheme.test_action.build_configuration = 'Auspice Debug'
scheme.analyze_action.build_configuration = 'Auspice Debug'
scheme.profile_action.build_configuration = 'Auspice Release'
scheme.archive_action.build_configuration = 'Auspice Release'
scheme.save_as(project.path, 'AuspiceClassic', true)
