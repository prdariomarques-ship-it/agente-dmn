# DARIUS OSS — ANDROID STUDIO HANDOFF

Since the cloud sandbox lacks a full Android SDK toolchain, physical APK compilation must occur on the local Windows environment. The current `mobile/` directory contains only the minimal structural boundaries required to securely wire the application to the `DARIUS Server`.

## Environment Prerequisites

- **Java JDK:** Ensure Java 17+ is installed.
- **Android Studio:** Giraffe or later is recommended.
- **Android SDK:** Ensure SDK 33 or 34 is installed.
- **Node.js:** Ensure Node 20+ is accessible to execute the backend locally.

## Build Steps

1.  **Extract Mobile Client**
    Copy the `mobile/` directory from the repository to your local Windows workspace (`C:\Users\dario\StudioProjects\agente-dmn\mobile`).

2.  **Initialize Expo Ecosystem**
    ```powershell
    cd mobile
    npm install
    npx expo prebuild --platform android
    ```

3.  **Android Studio Import**
    - Open Android Studio.
    - Select **"Open an existing Android Studio project"**.
    - Target the newly generated `mobile/android` folder.
    - Wait for Gradle sync to complete.

4.  **Networking Adjustments**
    If running the DARIUS Node server locally via Termux or WSL, ensure the `App.js` Axios instances point to the specific LAN IP assigned to that process (e.g., `http://192.168.1.10:3000`).
    Do not use `localhost` directly in the Android Emulator code as it will resolve to the emulator's internal loopback, not the host machine. Instead, use `10.0.2.2:3000`.

5.  **Compile APK**
    ```powershell
    cd mobile/android
    ./gradlew assembleDebug
    ```
    The output APK will be located at `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
