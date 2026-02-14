const { withXcodeProject } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeName</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeDeviceID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`;

function withPrivacyManifest(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName;
    const projectRoot = config.modRequest.platformProjectRoot;

    const privacyFilePath = path.join(
      projectRoot,
      projectName,
      "PrivacyInfo.xcprivacy"
    );

    fs.writeFileSync(privacyFilePath, PRIVACY_MANIFEST);

    // Add the file to the Xcode project if not already present
    const target = project.getFirstTarget();
    const groupKey = project.findPBXGroupKey({ name: projectName }) ||
      project.findPBXGroupKey({ path: projectName });

    if (groupKey) {
      const group = project.getPBXGroupByKey(groupKey);
      const hasFile = (group.children || []).some(
        (child) => child.comment === "PrivacyInfo.xcprivacy"
      );
      if (!hasFile) {
        project.addResourceFile(
          "PrivacyInfo.xcprivacy",
          { target: target.uuid },
          groupKey
        );
      }
    }

    return config;
  });
}

module.exports = withPrivacyManifest;
