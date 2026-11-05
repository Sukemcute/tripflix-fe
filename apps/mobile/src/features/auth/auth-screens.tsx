import { colors as c, spacing as s } from '@tripflix/tokens';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  assets,
  Badge,
  Button,
  copy,
  Field,
  Logo,
  Mascot,
  Notice,
  Screen,
  Txt,
  ui,
} from '@/components/mobile-ui';
import { useReview } from '@/features/review/review-provider';

export function OnboardingScreen() {
  return (
    <Screen
      back={false}
      footer={
        <>
          <Button icon="arrow-forward" onPress={() => router.replace('/(tabs)')}>
            {copy.onboarding.start}
          </Button>
          <Button tone="text" onPress={() => router.push('/login')}>
            {copy.onboarding.login}
          </Button>
        </>
      }
    >
      <View
        style={{
          backgroundColor: c.seaMist,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          padding: s.lg,
          minHeight: 310,
        }}
      >
        <Image
          source={assets.sea}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.2, borderRadius: 32 }}
        />
        <Mascot pose="welcome" size={250} />
        <Badge tone="sun">{copy.onboarding.badge}</Badge>
      </View>
      <View style={{ alignItems: 'center', gap: s.xl }}>
        <Logo />
        <Txt variant="title" style={ui.center}>
          {copy.onboarding.title}
        </Txt>
        <Txt variant="small" style={[ui.muted, ui.center]}>
          {copy.onboarding.body}
        </Txt>
      </View>
      <Txt variant="caption" style={[ui.muted, ui.center]}>
        {copy.common.demoNotice}
      </Txt>
    </Screen>
  );
}

export function LoginScreen({ afterSignIn }: { afterSignIn?: () => void } = {}) {
  const review = useReview();
  const { clearPendingAction } = review;
  useEffect(() => clearPendingAction, [clearPendingAction]);
  const [email, setEmail] = useState(review.contact.email);
  const [password, setPassword] = useState('');
  const [isRegistering, setRegistering] = useState(false);
  const [hasError, setError] = useState(false);
  function signIn() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 6) {
      setError(true);
      return;
    }
    review.setContact((previous) => ({ ...previous, email: email.trim() }));
    // Password is intentionally neither persisted nor sent in the review build.
    setPassword('');
    if (afterSignIn) afterSignIn();
    else review.finishSignIn();
  }
  return (
    <Screen title={isRegistering ? copy.auth.register : copy.auth.login}>
      <View style={{ height: 200, borderRadius: 24, overflow: 'hidden' }}>
        <Image source={assets.sea} style={{ width: '100%', height: '100%' }} />
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: c.overlay,
            padding: s.lg,
            justifyContent: 'flex-end',
          }}
        >
          <Txt variant="heading" style={{ color: c.background }}>
            {copy.auth.hero}
          </Txt>
        </View>
      </View>
      <View style={{ gap: s.sm }}>
        <Txt variant="title">{isRegistering ? copy.auth.registerTitle : copy.auth.title}</Txt>
        <Txt variant="small" style={ui.muted}>
          {copy.auth.body}
        </Txt>
      </View>
      <Notice>{copy.auth.demo}</Notice>
      <Field
        label={copy.booking.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder={copy.booking.emailPlaceholder}
        autoComplete="off"
      />
      <Field
        label={copy.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={signIn}
      />
      {hasError && (
        <Txt accessibilityRole="alert" variant="small" style={{ color: c.coralInk }}>
          {copy.auth.error}
        </Txt>
      )}
      <Button icon="arrow-forward" onPress={signIn}>
        {isRegistering ? copy.auth.register : copy.auth.submit}
      </Button>
      <Button
        tone="text"
        onPress={() => {
          setRegistering(!isRegistering);
          setError(false);
        }}
      >
        {isRegistering ? copy.auth.hasAccount : copy.auth.noAccount}{' '}
        {isRegistering ? copy.auth.login : copy.auth.register}
      </Button>
    </Screen>
  );
}
