import { Interface } from "@ethersproject/abi";
import { getShortcut } from "../src/helpers";
import { APITransaction, QuoteRequest, simulateTransactionOnQuoter } from "../src/simulations/simulateOnQuoter";

const weirollWalletInterface = new Interface(['function executeWeiroll(bytes32[] calldata commands, bytes[] calldata state) external payable returns (bytes[] memory)'])

const fromAddress = '0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11';
const weirollWalletAddress = '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736';

async function main() {
    try {
        const {shortcut, chainId} = await getShortcut();

        const args: string[] = process.argv.slice(4);
        if (args.length != 1) throw 'Error: Please pass amounts (use commas for multiple values)';
        const amountsIn = args[0].split(',');
    
        const { tokensIn, tokensOut } = shortcut.inputs[chainId];
    
        if (amountsIn.length != tokensIn.length) throw `Error: Incorrect number of amounts for shortcut. Expected ${tokensIn.length}`;
        
        const { commands, state, value } = await shortcut.build(chainId);
        const data = weirollWalletInterface.encodeFunctionData('executeWeiroll', [commands, state]);
        const tx: APITransaction = {
            from: fromAddress,
            to: weirollWalletAddress,
            data,
            value,
            spender: weirollWalletAddress,
            receiver: weirollWalletAddress,
        }
        const request: QuoteRequest = {
            chainId,
            transactions: [tx],
            tokenIn: tokensIn,
            tokenOut: tokensOut,
            amountIn: amountsIn,
        }
        const quote = await simulateTransactionOnQuoter(request);
        console.log('Quote: ', quote[0])
    } catch (e) {
        console.log(e);
    }
}

main();