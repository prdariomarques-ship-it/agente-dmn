# DARIUS OSS — MOBILE CHECKLIST

The Mobile component exists currently as a 2-file scaffold (`App.js` and `package.json`). Here is the checklist to transition it from scaffold to fully functional Android APK integrated with the DARIUS backend.

## 1. App Configuration (`app.json`)
- [ ] Create `app.json` at the root of `mobile/`.
- [ ] Set `"name": "DARIUS"`.
- [ ] Set `"slug": "darius-mobile"`.
- [ ] Configure `"android.package"` (e.g. `com.darius.os`).

## 2. API Client & Networking
- [ ] Create an Axios instance pointing to the Termux LAN IP (or `localhost` depending on execution mode).
- [ ] Ensure `android:usesCleartextTraffic="true"` is handled if testing over raw HTTP locally before deploying SSL.

## 3. UI Implementation
- [ ] Migrate the web/Tailwind logic to React Native primitives (View, Text) or a UI library (e.g. NativeWind).
- [ ] Implement Dashboard, Agents, Tasks views.

## 4. Emulator & Testing
- [ ] Test on Android Emulator via `npx expo start --android`.
- [ ] Validate HTTP connectivity from Emulator to `http://10.0.2.2:3000` (Android default alias for host localhost) or the specific Termux LAN IP.

## 5. APK Build
- [ ] Prebuild native folders: `npx expo prebuild --platform android`.
- [ ] Open `mobile/android` in Android Studio.
- [ ] Sync Gradle.
- [ ] Run `assembleDebug` (or `assembleRelease`) to generate the `.apk`.

## 6. Termux Deployment
- [ ] Verify `DARIUS_TERMUX_DEPLOYMENT.md` instructions.
- [ ] Run the backend on Termux (`DARIUS_HOST=0.0.0.0 npm run server`).
- [ ] Install APK on the same physical device.
- [ ] Connect APK to `http://localhost:3000`.
