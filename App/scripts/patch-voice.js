const fs = require('fs');
const path = require('path');

const voiceGradlePath = path.join(__dirname, '../node_modules/@react-native-voice/voice/android/build.gradle');
const voiceModuleJavaPath = path.join(__dirname, '../node_modules/@react-native-voice/voice/android/src/main/java/com/wenkesj/voice/VoiceModule.java');
const voiceDistJsPath = path.join(__dirname, '../node_modules/@react-native-voice/voice/dist/index.js');

if (fs.existsSync(voiceGradlePath)) {
  const content = `apply plugin: 'com.android.library'

repositories {
    mavenLocal()
    mavenCentral()
    google()
    maven {
        url "$projectDir/../node_modules/react-native/android"
    }
}

def DEFAULT_COMPILE_SDK_VERSION = 34

android {
    compileSdk rootProject.hasProperty('compileSdkVersion') ? rootProject.compileSdkVersion : DEFAULT_COMPILE_SDK_VERSION
    buildToolsVersion rootProject.hasProperty('buildToolsVersion') ? rootProject.buildToolsVersion : "34.0.0"
    namespace "com.wenkesj.voice"

    defaultConfig {
        minSdkVersion 21
        targetSdkVersion rootProject.hasProperty('targetSdkVersion') ? rootProject.targetSdkVersion : DEFAULT_COMPILE_SDK_VERSION
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    testImplementation 'junit:junit:4.12'
    implementation 'com.facebook.react:react-native:+'
}
`;
  fs.writeFileSync(voiceGradlePath, content, 'utf8');
  console.log('Successfully patched @react-native-voice/voice build.gradle');
}

if (fs.existsSync(voiceModuleJavaPath)) {
  let javaContent = fs.readFileSync(voiceModuleJavaPath, 'utf8');
  if (javaContent.includes('return "RCTVoice";')) {
    javaContent = javaContent.replace('return "RCTVoice";', 'return "Voice";');
  }

  // Null safety check for results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
  javaContent = javaContent.replace(
    `ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);\n    for (String result : matches) {\n      arr.pushString(result);\n    }`,
    `if (results != null) {\n      ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);\n      if (matches != null) {\n        for (String result : matches) {\n          arr.pushString(result);\n        }\n      }\n    }`
  );

  fs.writeFileSync(voiceModuleJavaPath, javaContent, 'utf8');
  console.log('Successfully patched VoiceModule.java');
}

if (fs.existsSync(voiceDistJsPath)) {
  let jsContent = fs.readFileSync(voiceDistJsPath, 'utf8');
  if (jsContent.includes('const Voice = react_native_1.NativeModules.Voice;')) {
    jsContent = jsContent.replace(
      'const Voice = react_native_1.NativeModules.Voice;',
      'const Voice = react_native_1.NativeModules.Voice || react_native_1.NativeModules.RCTVoice;'
    );
    fs.writeFileSync(voiceDistJsPath, jsContent, 'utf8');
    console.log('Successfully patched dist/index.js');
  }
}
