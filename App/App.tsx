import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import Loader from './src/components/Loader';
import SplashScreen from './src/screens/SplashScreen';
import useGlobalLoading from './src/hooks/useGlobalLoading';
import useAuthStore from './src/store/AuthStore';
import {navigationTheme} from './src/theme/navigationTheme';
import {linking} from './src/navigation/linking';

export default function App() {
  const globalLoading = useGlobalLoading();
  const hydrateAuth = useAuthStore(state => state.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Add a slight delay to the splash screen for visual effect
    Promise.all([
      hydrateAuth(),
      new Promise(resolve => setTimeout(() => resolve(null), 1500))
    ]).finally(() => setReady(true));
  }, [hydrateAuth]);

  if (!ready) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" />
      <NavigationContainer theme={navigationTheme} linking={linking as any}>
        <RootNavigator />
        <Loader show={globalLoading} text="Please wait" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
