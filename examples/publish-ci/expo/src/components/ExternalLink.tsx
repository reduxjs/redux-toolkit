import type { JSX } from 'react'
import { useCallback } from 'react'
import type { TouchableOpacityProps } from 'react-native'
import { Alert, Linking, TouchableOpacity } from 'react-native'

type ExternalLinkProps = TouchableOpacityProps & {
  url: string
}

export const ExternalLink = ({
  url,
  ...touchableOpacityProps
}: ExternalLinkProps): JSX.Element => {
  const onPress = useCallback(async () => {
    const supported = await Linking.canOpenURL(url)

    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert(`Don't know how to open this URL: ${url}`)
    }
  }, [url])

  return (
    <TouchableOpacity
      {...touchableOpacityProps}
      accessibilityRole="button"
      onPress={() => {
        void onPress()
      }}
    />
  )
}
