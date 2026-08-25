import type { AuthResponse, GeoHit, NotificationFeed, Person, Photo, Place, Region, Story, User, Visit } from './types'

const TOKEN_KEY = 'map.token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, { ...init, headers })
  if (response.status === 204) return undefined as T
  const text = await response.text()
  let data: { error?: string } | null = null
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string }
    } catch {
      throw new Error(response.ok ? 'Сервер ответил в неожиданном формате' : 'Не получилось выполнить запрос. Обнови страницу и попробуй ещё раз.')
    }
  }
  if (!response.ok) {
    throw new Error(data?.error ?? `Ошибка ${response.status}`)
  }
  return data as T
}

export const api = {
  register: (email: string, password: string, displayName: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<AuthResponse>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  me: () => request<User>('/api/me'),
  updateMe: (patch: { displayName?: string; mapColor?: string }) =>
    request<User>('/api/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  uploadAvatar: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<User>('/api/me/avatar', { method: 'POST', body })
  },
  deleteAvatar: () => request<User>('/api/me/avatar', { method: 'DELETE' }),
  regions: () => request<Region[]>('/api/regions'),
  visits: () => request<Visit[]>('/api/visits'),
  createVisit: (regionCode: string, extra: { note?: string; color?: string } = {}) =>
    request<Visit>('/api/visits', {
      method: 'POST',
      body: JSON.stringify({ regionCode, note: extra.note, color: extra.color }),
    }),
  updateVisitColor: (id: string, color: string) =>
    request<Visit>(`/api/visits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ color }),
    }),
  deleteVisit: (id: string) => request<void>(`/api/visits/${id}`, { method: 'DELETE' }),
  places: () => request<Place[]>('/api/places'),
  createPlace: (place: Omit<Place, 'id'>) =>
    request<Place>('/api/places', { method: 'POST', body: JSON.stringify(place) }),
  updatePlace: (id: string, place: Omit<Place, 'id'>) =>
    request<Place>(`/api/places/${id}`, { method: 'PUT', body: JSON.stringify(place) }),
  deletePlace: (id: string) => request<void>(`/api/places/${id}`, { method: 'DELETE' }),
  stories: () => request<Story[]>('/api/stories'),
  story: (id: string) => request<Story>(`/api/stories/${id}`),
  createStory: (story: { title: string; body: string; regionId?: string; placeId?: string }) =>
    request<Story>('/api/stories', { method: 'POST', body: JSON.stringify(story) }),
  updateStory: (id: string, story: { title: string; body: string; regionId?: string; placeId?: string }) =>
    request<Story>(`/api/stories/${id}`, { method: 'PUT', body: JSON.stringify(story) }),
  deleteStory: (id: string) => request<void>(`/api/stories/${id}`, { method: 'DELETE' }),
  photos: (storyId?: string) =>
    request<Photo[]>(storyId ? `/api/photos?storyId=${storyId}` : '/api/photos'),
  uploadMedia: (files: File[], extra: { storyId?: string; placeId?: string; visitId?: string } = {}) => {
    const body = new FormData()
    for (const file of files) body.append('files', file)
    if (extra.storyId) body.append('storyId', extra.storyId)
    if (extra.placeId) body.append('placeId', extra.placeId)
    if (extra.visitId) body.append('visitId', extra.visitId)
    return request<Photo[]>('/api/photos', { method: 'POST', body })
  },
  deletePhoto: (id: string) => request<void>(`/api/photos/${id}`, { method: 'DELETE' }),
  people: (q = '') => request<Person[]>(`/api/people?q=${encodeURIComponent(q)}`),
  person: (id: string) => request<Person>(`/api/people/${id}`),
  personRegions: (id: string) => request<Region[]>(`/api/people/${id}/regions`),
  personStories: (id: string) => request<Story[]>(`/api/people/${id}/stories`),
  personPlaces: (id: string) => request<Place[]>(`/api/people/${id}/places`),
  personPhotos: (id: string) => request<Photo[]>(`/api/people/${id}/photos`),
  geoSearch: (q: string, near?: { lat: number; lng: number }) => {
    const params = new URLSearchParams({ q })
    if (near) {
      params.set('lat', String(near.lat))
      params.set('lng', String(near.lng))
    }
    return request<GeoHit[]>(`/api/geo/search?${params}`)
  },
  geoReverse: (lat: number, lng: number) =>
    request<GeoHit | null>(`/api/geo/reverse?lat=${lat}&lng=${lng}`),
  friends: () => request<Person[]>('/api/friends'),
  incomingFriends: () => request<Person[]>('/api/friends/incoming'),
  requestFriend: (userId: string) =>
    request<Person>(`/api/friends/${userId}`, { method: 'POST' }),
  acceptFriend: (userId: string) =>
    request<Person>(`/api/friends/${userId}/accept`, { method: 'POST' }),
  removeFriend: (userId: string) => request<void>(`/api/friends/${userId}`, { method: 'DELETE' }),
  notifications: () => request<NotificationFeed>('/api/notifications'),
  readNotifications: () => request<NotificationFeed>('/api/notifications/read', { method: 'POST' }),
}

export async function loadAvatarBlob(path: string) {
  const token = getToken()
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Не удалось загрузить фото')
  return URL.createObjectURL(await response.blob())
}

export function photoUrl(id: string) {
  const token = getToken()
  if (!token) return `/api/photos/${id}`
  return `/api/photos/${id}?token=${encodeURIComponent(token)}`
}
