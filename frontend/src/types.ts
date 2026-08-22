export type User = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  mapColor: string
}

export type AuthResponse = User & {
  token: string
}

export type Region = {
  id: string
  code: string
  name: string
  type: string
  visited: boolean
  visitId: string | null
  color: string | null
}

export type Visit = {
  id: string
  regionId: string
  regionCode: string
  regionName: string
  visitedAt: string | null
  note: string | null
  color: string
}

export type Place = {
  id: string
  title: string
  description: string | null
  lat: number
  lng: number
  regionId: string | null
}

export type Story = {
  id: string
  title: string
  body: string
  regionId: string | null
  placeId: string | null
  createdAt: string
}

export type Photo = {
  id: string
  url: string
  contentType: string
  storyId: string | null
  placeId: string | null
  visitId: string | null
  regionId: string | null
  createdAt: string
}

export type AppNotification = {
  id: string
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED'
  read: boolean
  createdAt: string
  actor: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

export type NotificationFeed = {
  items: AppNotification[]
  unreadCount: number
}

export type Person = {
  id: string
  displayName: string
  avatarUrl: string | null
  mapColor: string
  relation: 'self' | 'none' | 'outgoing' | 'incoming' | 'friends'
  visitedCount: number
  storyCount: number
  photoCount: number
}
