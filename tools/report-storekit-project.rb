require 'xcodeproj'
root=File.expand_path(ARGV.fetch(0));project=Xcodeproj::Project.new(File.join(root,'ReportTests.xcodeproj'))
app=project.new_target(:application,'ReportTestHost',:osx,'14.0')
test=project.new_target(:unit_test_bundle,'ReportTests',:osx,'14.0');test.add_dependency(app)
app.source_build_phase.add_file_reference(project.main_group.new_file('TestHost.swift'))
%w[ReportClient.swift BaziReportStoreKitTests.swift].each { |f| test.source_build_phase.add_file_reference(project.main_group.new_file(f)) }
%w[BaziReport.storekit ReportSnapshot.json].each { |f| test.resources_build_phase.add_file_reference(project.main_group.new_file(f)) }
[app,test].each do |target|
 target.build_configurations.each do |config|
  config.build_settings.merge!({'GENERATE_INFOPLIST_FILE'=>'YES','SWIFT_VERSION'=>'5.0','PRODUCT_BUNDLE_IDENTIFIER'=>"art.lazying.lazyoracle.billing-tests.#{target.name}",'CODE_SIGN_IDENTITY'=>'-','CODE_SIGN_STYLE'=>'Automatic','ENABLE_TESTABILITY'=>'YES','INFOPLIST_KEY_LSUIElement'=>'YES','ONLY_ACTIVE_ARCH'=>'YES'})
  if target==test;config.build_settings['TEST_HOST']='$(BUILT_PRODUCTS_DIR)/ReportTestHost.app/Contents/MacOS/ReportTestHost';config.build_settings['BUNDLE_LOADER']='$(TEST_HOST)';end
 end
end
project.save
scheme=Xcodeproj::XCScheme.new;scheme.add_build_target(app);scheme.add_test_target(test);scheme.set_launch_target(app)
scheme.save_as(project.path,'ReportTests',true)
