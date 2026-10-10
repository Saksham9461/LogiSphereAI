import React, {useEffect} from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import Loader from './src/components/Loader';
import SplashScreen from './src/screens/SplashScreen';
import useGlobalLoading from './src/hooks/useGlobalLoading';
import useAuthStore from './src/store/AuthStore';
import {navigationTheme} from './src/theme/navigationTheme';
import {linking} from './src/navigation/linking';
import {colors} from './src/theme/colors';

export default function App() {
  const globalLoading = useGlobalLoading();
  const hydrateAuth = useAuthStore(state => state.hydrate);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  return (
    <SafeAreaProvider style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer
        theme={navigationTheme}
        linking={linking as any}
        fallback={<SplashScreen />}
      >
        <RootNavigator />
        <Loader show={globalLoading} text="Please wait" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
