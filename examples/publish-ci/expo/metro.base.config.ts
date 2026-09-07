import type { MetroConfig } from '@expo/metro-config'
import { getDefaultConfig } from '@expo/metro-config'

const config: MetroConfig = getDefaultConfig(import.meta.dirname)

export { config }
