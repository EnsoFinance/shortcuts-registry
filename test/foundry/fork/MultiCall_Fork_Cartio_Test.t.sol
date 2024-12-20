// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IERC20 } from "@openzeppelin-contracts-5.1.0/interfaces/IERC20.sol";
import { Test, console2 } from "forge-std-1.9.4//Test.sol";

contract MultiCall_Fork_Cartio_Test is Test {
    // --- Network environment variables ---
    int256 private constant SIMULATION_BLOCK_NUMBER_LATEST = -1;
    string private constant SIMULATION_CHAIN_ID = "SIMULATION_CHAIN_ID";
    string private constant SIMULATION_RPC_URL = "SIMULATION_RPC_URL";
    string private constant SIMULATION_BLOCK_NUMBER = "SIMULATION_BLOCK_NUMBER";

    // --- Simulation environment variables --
    string private constant SIMULATION_JSON_ENV_VAR = "SIMULATION_JSON_DATA";
    string private constant JSON_CHAIN_ID = ".chainId";
    string private constant JSON_RPC_URL = ".rpcUrl";
    string private constant JSON_BLOCK_NUMBER = ".blockNumber";
    string private constant JSON_CALLER = ".caller";
    string private constant JSON_RECIPE_MARKET_HUB = ".recipeMarketHub";
    string private constant JSON_WEIROLL_WALLET = ".weirollWallet";
    string private constant JSON_MULTICALL = ".multiCall";
    string private constant JSON_TX_DATA = ".txData";
    string private constant JSON_TOKENS_IN = ".tokensIn";
    string private constant JSON_AMOUNTS_IN = ".amountsIn";
    string private constant JSON_TOKENS_IN_HOLDERS = ".tokensInHolders";
    string private constant JSON_TOKENS_OUT = ".tokensOut";
    string private constant JSON_TOKENS_DUST = ".tokensDust";
    string private constant JSON_LABEL_KEYS = ".labelKeys";
    string private constant JSON_LABEL_VALUES = ".labelValues";

    // --- Shortcut ---
    int256 private s_blockNumber;
    address private s_caller;
    address private s_recipeMarketHub;
    address private s_weirollWallet;
    address private s_multiCall;
    bytes private s_txData;
    address[] private s_tokensIn;
    uint256[] private s_amountsIn;
    address[] private s_tokensOut;
    address[] private s_tokensDust;
    address[] private s_tokensInHolders;

    mapping(address address_ => string label) private s_addressToLabel;

    // --- Custom Errors ---
    error MultiCall_Fork_Cartio_Test__ArrayLengthsAreNotEq(
        string array1Name, uint256 array1Length, string array2Name, uint256 array2Length
    );
    error MultiCall_Fork_Cartio_Test__BalancePostIsNotAmountIn(
        address tokenIn, uint256 amountIn, uint256 balancePre, uint256 balancePost
    );
    error MultiCall_Fork_Cartio_Test__MultiCallAggregateCallFailed(bytes data);
    error MultiCall_Fork_Cartio_Test__TokenInHolderNotFound(address tokenIn);

    function setUp() public {
        // --- Read simulation json data from environment ---
        string memory jsonStr = vm.envString(SIMULATION_JSON_ENV_VAR);

        // --- Fork network ---
        string memory rpcUrl = vm.parseJsonString(jsonStr, JSON_RPC_URL);
        int256 blockNumber = vm.parseJsonInt(jsonStr, JSON_BLOCK_NUMBER);
        s_blockNumber = blockNumber;

        if (blockNumber == SIMULATION_BLOCK_NUMBER_LATEST) {
            vm.createSelectFork(rpcUrl);
        } else {
            vm.createSelectFork(rpcUrl, uint256(blockNumber));
        }

        address caller = vm.parseJsonAddress(jsonStr, JSON_CALLER);
        s_caller = caller;

        address recipeMarketHub = vm.parseJsonAddress(jsonStr, JSON_RECIPE_MARKET_HUB);
        s_recipeMarketHub = recipeMarketHub;

        address weirollWallet = vm.parseJsonAddress(jsonStr, JSON_WEIROLL_WALLET);
        s_weirollWallet = weirollWallet;

        address multiCall = vm.parseJsonAddress(jsonStr, JSON_MULTICALL);
        s_multiCall = multiCall;

        bytes memory txData = vm.parseJsonBytes(jsonStr, JSON_TX_DATA);
        s_txData = txData;

        address[] memory tokensIn = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_IN);
        s_tokensIn = tokensIn;

        uint256[] memory amountsIn = vm.parseJsonUintArray(jsonStr, JSON_AMOUNTS_IN);
        if (tokensIn.length != amountsIn.length) {
            revert MultiCall_Fork_Cartio_Test__ArrayLengthsAreNotEq(
                "tokensIn", tokensIn.length, "amountsIn", amountsIn.length
            );
        }
        s_amountsIn = amountsIn;

        address[] memory tokensInHolders = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_IN_HOLDERS);
        s_tokensInHolders = tokensInHolders;

        address[] memory tokensOut = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_OUT);
        s_tokensOut = tokensOut;

        address[] memory tokensDust = vm.parseJsonAddressArray(jsonStr, JSON_TOKENS_DUST);
        s_tokensDust = tokensDust;

        address[] memory labelKeys = vm.parseJsonAddressArray(jsonStr, JSON_LABEL_KEYS);
        string[] memory labelValues = vm.parseJsonStringArray(jsonStr, JSON_LABEL_VALUES);

        // --- Set labels ---
        // Simulation labels
        if (labelKeys.length != labelValues.length) {
            revert MultiCall_Fork_Cartio_Test__ArrayLengthsAreNotEq(
                "labelKeys", labelKeys.length, "labelValues", labelValues.length
            );
        }
        for (uint256 i = 0; i < labelKeys.length; i++) {
            s_addressToLabel[labelKeys[i]] = labelValues[i];
            vm.label(labelKeys[i], labelValues[i]);
        }

        // --- Fund addresses ---
        vm.deal(caller, 1000 ether);
    }

    function test_aggregateCalls_1() public {
        address[] memory tokensIn = s_tokensIn;
        uint256[] memory tokensInBalancesPre = new uint256[](tokensIn.length);
        uint256[] memory amountsIn = s_amountsIn;
        address[] memory tokensInHolders = s_tokensInHolders;
        address[] memory tokensOut = s_tokensOut;
        uint256[] memory tokensOutBalancesPre = new uint256[](tokensOut.length);
        address[] memory tokensDust = s_tokensDust;
        uint256[] memory tokensDustBalancesPre = new uint256[](tokensDust.length);

        // --- Calculate balances before ---
        // Tokens in (before funding them)
        for (uint256 i = 0; i < tokensIn.length; i++) {
            tokensInBalancesPre[i] = IERC20(tokensIn[i]).balanceOf(s_weirollWallet);
        }
        // Tokens out
        for (uint256 i = 0; i < tokensOut.length; i++) {
            tokensOutBalancesPre[i] = IERC20(tokensOut[i]).balanceOf(s_weirollWallet);
        }
        // Tokens dust
        for (uint256 i = 0; i < tokensDust.length; i++) {
            tokensDustBalancesPre[i] = IERC20(tokensDust[i]).balanceOf(s_weirollWallet);
        }
        // Fund wallet from Tokens In holders
        for (uint256 i = 0; i < tokensIn.length; i++) {
            address tokenIn = tokensIn[i];
            uint256 amountIn = amountsIn[i];
            address holder = tokensInHolders[i];
            if (holder == address(0)) {
                revert MultiCall_Fork_Cartio_Test__TokenInHolderNotFound(tokenIn);
            }

            uint256 balancePre = IERC20(tokenIn).balanceOf(s_weirollWallet);

            vm.prank(holder);
            IERC20(tokenIn).transfer(s_weirollWallet, amountIn);
            uint256 balancePost = IERC20(tokenIn).balanceOf(s_weirollWallet);

            if (balancePost - balancePre != amountIn) {
                revert MultiCall_Fork_Cartio_Test__BalancePostIsNotAmountIn(tokenIn, amountIn, balancePre, balancePost);
            }
        }

        // --- Execute shortcut ---
        vm.prank(s_caller);
        uint256 gasStart = gasleft();
        (bool success, bytes memory data) = s_multiCall.call(s_txData);
        uint256 gasEnd = gasleft();
        if (!success) {
            revert MultiCall_Fork_Cartio_Test__MultiCallAggregateCallFailed(data);
        }

        // -- Log simulation results ---
        console2.log(unicode"╔══════════════════════════════════════════╗");
        console2.log(unicode"║              SIMULATION RESULTS          ║");
        console2.log(unicode"╚══════════════════════════════════════════╝");
        console2.log("| Chain ID    : ", block.chainid);
        if (s_blockNumber == SIMULATION_BLOCK_NUMBER_LATEST) {
            console2.log("| Block Number (Latest): ", block.number);
        } else {
            console2.log("| Block Number (Fork): ", block.number);
        }
        // Tokens in
        console2.log(unicode"|────────────────────────────────────────────");
        console2.log("| - TOKENS IN -------------");
        if (tokensOut.length == 0) {
            console2.log("| No Tokens In");
        }
        for (uint256 i = 0; i < tokensIn.length; i++) {
            uint256 tokenInBalancePost = IERC20(tokensIn[i]).balanceOf(s_weirollWallet);
            console2.log("| Addr    : ", tokensIn[i]);
            console2.log("| Name    : ", s_addressToLabel[tokensIn[i]]);
            console2.log("| Amount  : ");
            console2.log("|   Pre   : ", tokensInBalancesPre[i]);
            console2.log("|   In    : ", amountsIn[i]);
            console2.log("|   Post  : ", tokenInBalancePost);
            if (i != tokensIn.length - 1) {
                console2.log(unicode"|--------------------------------------------");
            }
        }

        // Tokens out
        console2.log(unicode"|────────────────────────────────────────────");
        console2.log("| - TOKENS OUT -------------");
        if (tokensOut.length == 0) {
            console2.log("| No Tokens Out");
        }
        for (uint256 i = 0; i < tokensOut.length; i++) {
            uint256 tokenOutBalancePost = IERC20(tokensOut[i]).balanceOf(s_weirollWallet);
            console2.log("| Addr    : ", tokensOut[i]);
            console2.log("| Name    : ", s_addressToLabel[tokensOut[i]]);
            console2.log("| Amount  : ", tokenOutBalancePost - tokensOutBalancesPre[i]);
            console2.log("|   Pre   : ", tokensOutBalancesPre[i]);
            console2.log("|   Post  : ", tokenOutBalancePost);
            if (i != tokensOut.length - 1) {
                console2.log(unicode"|--------------------------------------------");
            }
        }

        // Tokens dust
        console2.log(unicode"|────────────────────────────────────────────");
        console2.log("|- DUST TOKENS -------------");
        if (tokensDust.length == 0) {
            console2.log("| No Dust Tokens");
        }
        for (uint256 i = 0; i < tokensDust.length; i++) {
            uint256 tokenDustBalancePost = IERC20(tokensDust[i]).balanceOf(s_weirollWallet);
            console2.log("| Addr    : ", tokensDust[i]);
            console2.log("| Name    : ", s_addressToLabel[tokensDust[i]]);
            console2.log("| Amount  : ", tokenDustBalancePost - tokensDustBalancesPre[i]);
            console2.log("|   Pre   : ", tokensDustBalancesPre[i]);
            console2.log("|   Post  : ", tokenDustBalancePost);
            if (i != tokensDust.length - 1) {
                console2.log(unicode"|--------------------------------------------");
            }
        }
        console2.log(unicode"|────────────────────────────────────────────");
        console2.log("|- Gas --------------------");
        console2.log("| Used    : ", gasStart - gasEnd);
        console2.log(unicode"╚══════════════════════════════════════════╝");
    }
}
