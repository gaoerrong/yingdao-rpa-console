const mockFlag = String(import.meta.env.VITE_ENABLE_MOCK || '').toLowerCase()

export const isMockEnabled = mockFlag === 'true' || mockFlag === '1' || mockFlag === 'yes'
