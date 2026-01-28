import { logError } from 'backend/logger'
import { getInfoFromProtonDB } from '../utils'
import { axiosClient } from 'backend/utils'

jest.mock('backend/logger')

describe('getInfoFromProtonDB', () => {
  test('fetches successfully via steamid', async () => {
    const mockAxios = jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: { tier: 'gold' }
    })

    const result = await getInfoFromProtonDB('1234')
    expect(result).toStrictEqual(testProtonDBInfo)
    expect(mockAxios).toHaveBeenCalled()
  })
  test('api change', async () => {
    const mockAxios = jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: { tierLevel: 'gold' }
    })

    const result = await getInfoFromProtonDB('1234')
    expect(result).toStrictEqual(null)
    expect(mockAxios).toHaveBeenCalled()
  })
  test('does not find game', async () => {
    const mockAxios = jest
      .spyOn(axiosClient, 'get')
      .mockRejectedValue(new Error('not found'))

    const result = await getInfoFromProtonDB('1234')
    expect(result).toBeNull()
    expect(mockAxios).toHaveBeenCalled()
    expect(logError).toHaveBeenCalledWith(
      ['Was not able to get ProtonDB data for 1234', undefined],
      'ExtraGameInfo'
    )
  })

  test('no SteamID', async () => {
    const mockAxios = jest.spyOn(axiosClient, 'get')

    const result = await getInfoFromProtonDB('')
    expect(result).toBeNull()
    expect(mockAxios).not.toHaveBeenCalled()
  })
})

const testProtonDBInfo = {
  level: 'gold'
}
