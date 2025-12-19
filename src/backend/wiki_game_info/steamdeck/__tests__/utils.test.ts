import { logError } from 'backend/logger'
import { getSteamDeckComp } from '../utils'
import { AxiosError } from 'axios'
import { axiosClient } from 'backend/utils'

jest.mock('backend/logger')

describe('getSteamDeckComp', () => {
  test('fetches successfully via steamid', async () => {
    const mockAxios = jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: { results: { resolved_category: 1 } }
    })

    const result = await getSteamDeckComp('1234')
    expect(result).toStrictEqual(testProtonDBInfo)
    expect(mockAxios).toHaveBeenCalled()
  })
  test('api change', async () => {
    const mockAxios = jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: { results: { tierLevel: 'gold' } }
    })

    const result = await getSteamDeckComp('1234')
    expect(result).toStrictEqual(null)
    expect(mockAxios).toHaveBeenCalled()
  })
  test('does not find game', async () => {
    const mockAxios = jest
      .spyOn(axiosClient, 'get')
      .mockRejectedValue(<AxiosError>new Error('not found'))

    const result = await getSteamDeckComp('1234')
    expect(result).toBeNull()
    expect(mockAxios).toHaveBeenCalled()
    expect(logError).toHaveBeenCalledWith(
      ['Was not able to get Stem Deck data for 1234', undefined],
      'ExtraGameInfo'
    )
  })

  test('no SteamID', async () => {
    const mockAxios = jest.spyOn(axiosClient, 'get')

    const result = await getSteamDeckComp('')
    expect(result).toBeNull()
    expect(mockAxios).not.toHaveBeenCalled()
  })
})

const testProtonDBInfo = {
  category: 1
}
