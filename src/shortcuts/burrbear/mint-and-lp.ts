import { Builder } from '@ensofinance/shortcuts-builder'
import { RoycoClient } from '@ensofinance/shortcuts-builder/client/implementations/roycoClient'
import { walletAddress } from '@ensofinance/shortcuts-builder/helpers'
import { ChainIds, WeirollScript } from '@ensofinance/shortcuts-builder/types'
import {
  getStandardByProtocol,
  Standards,
} from '@ensofinance/shortcuts-standards'
import { TokenAddresses } from '@ensofinance/shortcuts-standards/addresses'
import { div } from '@ensofinance/shortcuts-standards/helpers/math'
import { Input, Output, Shortcut } from '../../types'
import { balanceOf, mintHoney } from '../../utils'

export class BurrbearHoneyUsdcNectShortcut implements Shortcut {
  name = 'kodiak-honey-usdc'
  description = ''
  supportedChains = [ChainIds.Cartio]
  inputs: Record<number, Input> = {
    [ChainIds.Cartio]: {
      usdc: TokenAddresses.cartio.usdc,
      honey: TokenAddresses.cartio.honey,
      nect: TokenAddresses.cartio.nect,
      pool: '0xFbb99BAD8eca0736A9ab2a7f566dEbC9acb607f0',
      primary: Standards.Kodiak_Islands.protocol.addresses!.cartio!.router,
    },
  }

  async build(chainId: number): Promise<Output> {
    const client = new RoycoClient()

    const inputs = this.inputs[chainId]
    const { usdc, honey, nect, island, primary } = inputs

    const builder = new Builder(chainId, client, {
      tokensIn: [usdc],
      tokensOut: [island],
    })
    const balancer = getStandardByProtocol('balancer-v2', chainId)
    const amountIn = await builder.add(balanceOf(usdc, walletAddress()))
    const oneThirdAmount = await div(amountIn, 3, builder)
    const mintedHoneyAmount = await mintHoney(usdc, oneThirdAmount, builder)

    await balancer.deposit.addToBuilder(builder, {
      tokenIn: [usdc, honey, nect],
      tokenOut: island,
      amountIn: [mintedHoneyAmount, oneThirdAmount, oneThirdAmount],
      primaryAddress: primary,
    })

    const payload = await builder.build({
      requireWeiroll: true,
      returnWeirollScript: true,
    })

    return {
      script: payload.shortcut as WeirollScript,
      metadata: builder.metadata,
    }
  }
}
