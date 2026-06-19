import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

const api = axios.create({
  baseURL: `${baseURL.replace(/\/$/, '')}/api`,
  timeout: 20000
})

const TOKEN_KEY = 'campaignsToken'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && onUnauthorized) {
      onUnauthorized()
    }
    return Promise.reject(error)
  }
)

export async function login(username, password) {
  const { data } = await api.post('/Auth/login', { username, password })
  return data
}

export async function getHealth() {
  const { data } = await api.get('/Health')
  return data
}

export async function getEvents() {
  const { data } = await api.get('/Events')
  return data
}

export async function getContacts(filters) {
  const { data } = await api.get('/Contacts', { params: cleanParams(filters) })
  return data
}

export async function getCampaigns() {
  const { data } = await api.get('/Campaigns')
  return data
}

export async function createCampaign(payload) {
  const { data } = await api.post('/Campaigns', payload)
  return data
}

export async function previewRecipients(campaignId, filters) {
  const { data } = await api.post(`/Campaigns/${campaignId}/recipients/preview`, cleanPayload(filters))
  return data
}

export async function addRecipientsFromFilter(campaignId, filters) {
  const { data } = await api.post(`/Campaigns/${campaignId}/recipients/from-filter`, cleanPayload(filters))
  return data
}

export async function addRecipientsByIds(campaignId, contactIds, sourceEventId) {
  const { data } = await api.post(`/Campaigns/${campaignId}/recipients/from-contacts`, {
    contactIds,
    sourceEventId: sourceEventId || null
  })
  return data
}

export async function getRecipients(campaignId) {
  const { data } = await api.get(`/Campaigns/${campaignId}/recipients`)
  return data
}

export async function getCampaign(campaignId) {
  const { data } = await api.get(`/Campaigns/${campaignId}`)
  return data
}

export async function getSegments() {
  const { data } = await api.get('/Segments')
  return data
}

export async function saveSegment(name, filters, segmentBy) {
  const { data } = await api.post('/Segments', { name, filters, segmentBy })
  return data
}

export async function deleteSegment(id) {
  const { data } = await api.delete(`/Segments/${id}`)
  return data
}

export async function getAttachments(campaignId) {
  const { data } = await api.get(`/Campaigns/${campaignId}/attachments`)
  return data
}

export async function uploadAttachment(campaignId, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/Campaigns/${campaignId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

export async function deleteAttachment(campaignId, attachmentId) {
  const { data } = await api.delete(`/Campaigns/${campaignId}/attachments/${attachmentId}`)
  return data
}

export async function clearRecipients(campaignId) {
  const { data } = await api.delete(`/Campaigns/${campaignId}/recipients`)
  return data
}

export async function updateCampaign(campaignId, payload) {
  const { data } = await api.put(`/Campaigns/${campaignId}`, payload)
  return data
}

export async function deleteCampaign(campaignId) {
  const { data } = await api.delete(`/Campaigns/${campaignId}`)
  return data
}

export async function sendCampaignRequest(campaignId, channel) {
  const params = channel ? { channel } : {}
  const { data } = await api.post(`/Campaigns/${campaignId}/send`, null, { params })
  return data
}

function cleanParams(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, item]) => item !== '' && item !== null && item !== undefined)
  )
}

function cleanPayload(value) {
  const payload = { ...(value || {}) }
  Object.keys(payload).forEach((key) => {
    if (payload[key] === '') payload[key] = null
  })
  return payload
}
