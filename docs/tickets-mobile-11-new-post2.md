## Follow-up fix before push
A keyboard-covering usability issue was found during manual testing.

Problem:
- On iPhone/Expo Go, when typing in composer-style screens, the keyboard can cover inputs/buttons.
- This affects NewPost and also appears in other input screens like messaging and profile editing.

Fix requirement:
- Make form/composer screens keyboard-safe before pushing this branch.
- At minimum:
  - NewPostScreen
  - ConversationScreen
  - EditProfileScreen
- If SignInScreen is easy to include, include it too.
- Use stable Expo/React Native patterns (KeyboardAvoidingView, ScrollView, safe padding).
- Do not redesign the UI; just ensure controls remain usable when keyboard is open.