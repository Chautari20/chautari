import React, { useMemo, useRef } from 'react';
import DigestManager from '../components/common/DigestManager';
import BackButton from '../components/common/BackButton';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { useData } from '../data/store';
import { CIRCLE_DIR_SEE_ALL_TITLES } from '../utils/circleDirectory';
import { firstIncompleteOnboardingRoute } from '../utils/email';

import SplashScreen from '../screens/auth/SplashScreen';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import PhoneRegisterScreen from '../screens/auth/PhoneRegisterScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import EmailLoginScreen from '../screens/auth/EmailLoginScreen';
import EmailLoginCodeScreen from '../screens/auth/EmailLoginCodeScreen';
import ProfileNameScreen from '../screens/auth/ProfileNameScreen';
import EmailScreen from '../screens/auth/EmailScreen';
import EmailCodeScreen from '../screens/auth/EmailCodeScreen';
import RecoveryEmailScreen from '../screens/auth/RecoveryEmailScreen';
import RecoveryEmailCodeScreen from '../screens/auth/RecoveryEmailCodeScreen';
import RecoveryNewPhoneScreen from '../screens/auth/RecoveryNewPhoneScreen';
import RecoveryPhoneCodeScreen from '../screens/auth/RecoveryPhoneCodeScreen';
import RecoverySuccessScreen from '../screens/auth/RecoverySuccessScreen';
import ProfileSuburbScreen from '../screens/auth/ProfileSuburbScreen';
import MainTabs from './MainTabs';
import QuestionDetailScreen from '../screens/questions/QuestionDetailScreen';
import AskComposerScreen from '../screens/questions/AskComposerScreen';
import CircleDetailScreen from '../screens/circles/CircleDetailScreen';
import CreateCircleScreen from '../screens/circles/CreateCircleScreen';
import CirclesSectionSeeAllScreen from '../screens/circles/CirclesSectionSeeAllScreen';
import EditCircleScreen from '../screens/circles/EditCircleScreen';
import SearchScreen from '../screens/home/SearchScreen';
import ExpertProfileScreen from '../screens/experts/ExpertProfileScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import VerifiedApplicationScreen from '../screens/experts/VerifiedApplicationScreen';
import ExpertProfessionalSetupScreen from '../screens/experts/ExpertProfessionalSetupScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ChangePhoneEmailCodeScreen from '../screens/settings/ChangePhoneEmailCodeScreen';
import ChangePhoneNewScreen from '../screens/settings/ChangePhoneNewScreen';
import ChangePhoneSmsCodeScreen from '../screens/settings/ChangePhoneSmsCodeScreen';
import ReportScreen from '../screens/modals/ReportScreen';
import HelpScreen from '../screens/settings/HelpScreen';
import TermsScreen from '../screens/settings/TermsScreen';
import PrivacyScreen from '../screens/settings/PrivacyScreen';
import AboutScreen from '../screens/settings/AboutScreen';
import DeleteAccountScreen from '../screens/settings/DeleteAccountScreen';
import ImageViewerScreen from '../screens/modals/ImageViewerScreen';
import MyPostsScreen from '../screens/profile/MyPostsScreen';
import SavedPostsScreen from '../screens/profile/SavedPostsScreen';
import ArrivalChecklistScreen from '../screens/checklist/ArrivalChecklistScreen';
import ProfilePhotoPreviewScreen from '../screens/modals/ProfilePhotoPreviewScreen';

const Stack = createNativeStackNavigator();

const modalOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  headerBackTitle: 'Cancel',
};

const profilePhotoPreviewOptions = {
  title: 'Preview photo',
  headerShown: true,
  presentation: 'modal',
  animation: 'slide_from_bottom',
  headerBackTitle: 'Cancel',
};

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { state } = useData();
  const navRef = useRef(null);
  const [minTimePassed, setMinTimePassed] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const ready = state.booted && state.authReady && minTimePassed;
  const needsProfile = !!state.authUserId && !state.currentUserId;
  const resumeOnboarding = needsProfile
    ? firstIncompleteOnboardingRoute({
      hasName: state.authHasName,
      emailVerified: state.authEmailVerified,
    })
    : undefined;
  const stackKey = !ready
    ? 'splash'
    : state.currentUserId
      ? 'app'
      : needsProfile
        ? 'onboard'
        : 'auth';

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.accent,
      },
    };
  }, [colors, isDark]);

  const headerOptions = useMemo(() => ({
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700' },
    headerShadowVisible: false,
    headerBackTitle: 'Back',
    headerBackVisible: false,
    headerLeft: (props) => <BackButton {...props} tintColor={colors.text} />,
    contentStyle: { backgroundColor: colors.bg },
    animation: 'slide_from_right',
    freezeOnBlur: true,
  }), [colors]);

  return (
    <NavigationContainer ref={navRef} theme={navTheme}>
      <DigestManager navigationRef={navRef} />
      <Stack.Navigator
        key={stackKey}
        screenOptions={headerOptions}
        initialRouteName={!ready ? 'Splash' : resumeOnboarding || (stackKey === 'auth' ? 'PhoneEntry' : undefined)}
      >
        {!ready ? (
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false, animation: 'fade' }} />
        ) : !state.currentUserId ? (
          needsProfile ? (
            <Stack.Group screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="ProfileName" component={ProfileNameScreen} options={{ headerShown: true, title: 'Your profile', headerBackTitle: 'Back' }} />
              <Stack.Screen name="Email" component={EmailScreen} options={{ headerShown: true, title: 'Recovery email', headerBackTitle: 'Back' }} />
              <Stack.Screen name="EmailCode" component={EmailCodeScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="ProfileSuburb" component={ProfileSuburbScreen} options={{ headerShown: true, title: 'Almost there', headerBackTitle: 'Back' }} />
              <Stack.Screen name="ProfilePhotoPreview" component={ProfilePhotoPreviewScreen} options={profilePhotoPreviewOptions} />
            </Stack.Group>
          ) : (
            <Stack.Group screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="PhoneRegister" component={PhoneRegisterScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="Otp" component={OtpScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="EmailLogin" component={EmailLoginScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="EmailLoginCode" component={EmailLoginCodeScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="RecoveryEmail" component={RecoveryEmailScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="RecoveryEmailCode" component={RecoveryEmailCodeScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="RecoveryNewPhone" component={RecoveryNewPhoneScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="RecoveryPhoneCode" component={RecoveryPhoneCodeScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="RecoverySuccess" component={RecoverySuccessScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="ProfileName" component={ProfileNameScreen} options={{ headerShown: true, title: 'Your profile', headerBackTitle: 'Back' }} />
              <Stack.Screen name="Email" component={EmailScreen} options={{ headerShown: true, title: 'Recovery email', headerBackTitle: 'Back' }} />
              <Stack.Screen name="EmailCode" component={EmailCodeScreen} options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
              <Stack.Screen name="ProfileSuburb" component={ProfileSuburbScreen} options={{ headerShown: true, title: 'Almost there', headerBackTitle: 'Back' }} />
              <Stack.Screen name="ProfilePhotoPreview" component={ProfilePhotoPreviewScreen} options={profilePhotoPreviewOptions} />
            </Stack.Group>
          )
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} options={{ title: 'Post' }} />
            <Stack.Screen name="CircleDetail" component={CircleDetailScreen} options={{ title: '' }} />
            <Stack.Screen
              name="CirclesSectionSeeAll"
              component={CirclesSectionSeeAllScreen}
              options={({ route }) => ({ title: CIRCLE_DIR_SEE_ALL_TITLES[route.params?.sectionKey] || 'Circles' })}
            />
            <Stack.Screen name="CreateCircle" component={CreateCircleScreen} options={{ title: 'Create a Circle' }} />
            <Stack.Screen name="EditCircle" component={EditCircleScreen} options={{ title: 'Edit circle' }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
            <Stack.Screen name="ExpertProfile" component={ExpertProfileScreen} options={({ route }) => ({ title: route.params?.title || 'Expert' })} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} options={({ route }) => ({ title: route.params?.title || 'Profile' })} />
            <Stack.Screen name="VerifiedApplication" component={VerifiedApplicationScreen} options={{ title: 'Become a Verified Expert' }} />
            <Stack.Screen name="ExpertProfessionalSetup" component={ExpertProfessionalSetupScreen} options={{ title: 'Expert profile setup' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Activity' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
            <Stack.Screen name="MyPosts" component={MyPostsScreen} options={{ title: 'My Posts' }} />
            <Stack.Screen name="SavedPosts" component={SavedPostsScreen} options={{ title: 'Saved Posts' }} />
            <Stack.Screen name="ArrivalChecklist" component={ArrivalChecklistScreen} options={{ title: 'First 30 Days' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="ChangePhoneEmailCode" component={ChangePhoneEmailCodeScreen} options={{ title: 'Change phone number' }} />
            <Stack.Screen name="ChangePhoneNew" component={ChangePhoneNewScreen} options={{ title: 'New number' }} />
            <Stack.Screen name="ChangePhoneSmsCode" component={ChangePhoneSmsCodeScreen} options={{ title: '' }} />
            <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'Help & FAQ' }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms & Conditions' }} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
            <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About Chautari' }} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Delete account' }} />

            <Stack.Group screenOptions={modalOptions}>
              <Stack.Screen name="AskComposer" component={AskComposerScreen} options={{ title: 'New post' }} />
              <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Report' }} />
              <Stack.Screen name="ImageViewer" component={ImageViewerScreen} options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="ProfilePhotoPreview" component={ProfilePhotoPreviewScreen} options={profilePhotoPreviewOptions} />
            </Stack.Group>
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return <AppNavigator />;
}
