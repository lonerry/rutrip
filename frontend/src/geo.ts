import type { Region } from './types'

type FeatureProps = {
  code?: string
  name?: string
}

export function regionCodeFromFeature(props: FeatureProps | undefined, regions: Region[]) {
  const code = props?.code
  if (code && regions.some((region) => region.code === code)) return code
  return null
}
