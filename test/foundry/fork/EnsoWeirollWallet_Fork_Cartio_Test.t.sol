// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IERC20 } from "@openzeppelin-contracts-5.1.0/interfaces/IERC20.sol";
import { Test, console2 } from "forge-std-1.9.4//Test.sol";
import { IWeirollWallet } from "test-helpers/interfaces/IWeirollWallet.sol";

contract EnsoWeirollWallet_Fork_Cartio_Test is Test {
    // --- Network environment variables ---
    int256 private constant SIMULATION_BLOCK_NUMBER_LATEST = -1;
    string private constant SIMULATION_CHAIN_ID = "SIMULATION_CHAIN_ID";
    string private constant SIMULATION_RPC_URL = "SIMULATION_RPC_URL";
    string private constant SIMULATION_BLOCK_NUMBER = "SIMULATION_BLOCK_NUMBER";

    // --- Simulation environment variables --
    // Tokens In

    // Shortcut calldata
    string private constant SIMULATION_JSON_CALLDATA_ENV_VAR = "SIMULATION_JSON_CALLDATA";
    string private constant SIMULATION_JSON_CALLDATA_KEY_COMMANDS = ".commands";
    string private constant SIMULATION_JSON_CALLDATA_KEY_STATE = ".state";
    string private constant SIMULATION_JSON_CALLDATA_KEY_VALUE = ".value";
    string private constant SIMULATION_JSON_CALLDATA_TOKENS_IN = ".tokensIn";
    string private constant SIMULATION_JSON_CALLDATA_AMOUNTS_IN = ".amountsIn";
    string private constant SIMULATION_JSON_CALLDATA_TOKENS_IN_HOLDERS = ".tokensInHolders";
    string private constant SIMULATION_JSON_CALLDATA_TOKENS_OUT = ".tokensOut";
    string private constant SIMULATION_JSON_CALLDATA_TOKENS_DUST = ".tokensDust";
    string private constant SIMULATION_JSON_CALLDATA_LABEL_KEYS = ".labelKeys";
    string private constant SIMULATION_JSON_CALLDATA_LABEL_VALUES = ".labelValues";

    // --- Known addresses ---
    // Enso accounts
    address private constant ENSO_EOA_1 = 0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11;
    // Enso contracts
    address private constant ENSO_ROUTER_1 = 0x80EbA3855878739F4710233A8a19d89Bdd2ffB8E;
    address private constant ENSO_SHORTCUTS_1 = 0x7d585B0e27BBb3D981b7757115EC11F47c476994;
    address private constant ENSO_DELEGATE_1 = 0x38147794FF247e5Fc179eDbAE6C37fff88f68C52;
    address private constant ROYCO_WALLET_HELPERS_1 = 0x07899ac8BE7462151d6515FCd4773DD9267c9911;
    IWeirollWallet private constant ENSO_WEIROLL_WALLET_1 = IWeirollWallet(0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736);

    // --- Shortcut ---
    bytes32[] private s_commands;
    bytes[] private s_state;
    uint256 private s_value;
    address[] private s_tokensIn;
    uint256[] private s_amountsIn;
    address[] private s_tokensOut;
    address[] private s_tokensDust;
    mapping(address address_ => string label) private s_addressToLabel;

    // --- Custom Errors ---
    error EnsoWeirollWallet_Fork_Cartio_Test__ArrayLengthsAreNotEq(
        string array1Name, uint256 array1Length, string array2Name, uint256 array2Length
    );
    error EnsoWeirollWallet_Fork_Cartio_Test__BalancePostIsNotAmountIn(
        address tokenIn, uint256 amountIn, uint256 balancePre, uint256 balancePost
    );
    error EnsoWeirollWallet_Fork_Cartio_Test__TokenInHolderNotFound(address tokenIn);

    function setUp() public {
        // --- Fork network ---
        string memory rpcUrl = vm.envString(SIMULATION_RPC_URL);
        int256 blockNumber = vm.envInt(SIMULATION_BLOCK_NUMBER);
        if (blockNumber == SIMULATION_BLOCK_NUMBER_LATEST) {
            vm.createSelectFork(rpcUrl);
        } else {
            vm.createSelectFork(rpcUrl, uint256(blockNumber));
        }

        // --- Read simulation calldata from environment ---
        string memory simulationCalldata = vm.envString(SIMULATION_JSON_CALLDATA_ENV_VAR);
        s_commands = vm.parseJsonBytes32Array(simulationCalldata, SIMULATION_JSON_CALLDATA_KEY_COMMANDS);
        s_state = vm.parseJsonBytesArray(simulationCalldata, SIMULATION_JSON_CALLDATA_KEY_STATE);
        s_value = vm.parseJsonUint(simulationCalldata, SIMULATION_JSON_CALLDATA_KEY_VALUE);

        address[] memory tokensIn = vm.parseJsonAddressArray(simulationCalldata, SIMULATION_JSON_CALLDATA_TOKENS_IN);
        uint256[] memory amountsIn = vm.parseJsonUintArray(simulationCalldata, SIMULATION_JSON_CALLDATA_AMOUNTS_IN);
        address[] memory tokensOut = vm.parseJsonAddressArray(simulationCalldata, SIMULATION_JSON_CALLDATA_TOKENS_OUT);

        address[] memory tokensInHolders =
            vm.parseJsonAddressArray(simulationCalldata, SIMULATION_JSON_CALLDATA_TOKENS_IN_HOLDERS);
        address[] memory tokensDust = vm.parseJsonAddressArray(simulationCalldata, SIMULATION_JSON_CALLDATA_TOKENS_DUST);
        address[] memory labelKeys = vm.parseJsonAddressArray(simulationCalldata, SIMULATION_JSON_CALLDATA_LABEL_KEYS);
        string[] memory labelValues = vm.parseJsonStringArray(simulationCalldata, SIMULATION_JSON_CALLDATA_LABEL_VALUES);

        if (tokensIn.length != amountsIn.length) {
            revert EnsoWeirollWallet_Fork_Cartio_Test__ArrayLengthsAreNotEq(
                "tokensIn", tokensIn.length, "amountsIn", amountsIn.length
            );
        }

        s_tokensIn = tokensIn;
        s_amountsIn = amountsIn;
        s_tokensOut = tokensOut;
        s_tokensDust = tokensDust;

        // --- Set labels ---
        // Enso EOA
        vm.label(ENSO_EOA_1, "Enso_EOA_1");
        // Enso contracts
        vm.label(ENSO_ROUTER_1, "Enso_Router_1");
        vm.label(ENSO_SHORTCUTS_1, "Enso_Shortcuts_1");
        vm.label(ENSO_DELEGATE_1, "Enso_Delegate_1");
        vm.label(ROYCO_WALLET_HELPERS_1, "Royco_Wallet_Helpers_1");
        vm.label(address(ENSO_WEIROLL_WALLET_1), "Enso_Weiroll_Wallet_1");
        // Simulation labels
        if (labelKeys.length != labelValues.length) {
            revert EnsoWeirollWallet_Fork_Cartio_Test__ArrayLengthsAreNotEq(
                "labelKeys", labelKeys.length, "labelValues", labelValues.length
            );
        }
        for (uint256 i = 0; i < labelKeys.length; i++) {
            s_addressToLabel[labelKeys[i]] = labelValues[i];
            vm.label(labelKeys[i], labelValues[i]);
        }

        // --- Fund addresses ---
        vm.deal(ENSO_EOA_1, 1000 ether);

        for (uint256 i = 0; i < tokensIn.length; i++) {
            address tokenIn = tokensIn[i];
            uint256 amountIn = amountsIn[i];
            address holder = tokensInHolders[i];
            if (holder == address(0)) {
                revert EnsoWeirollWallet_Fork_Cartio_Test__TokenInHolderNotFound(tokenIn);
            }

            uint256 balancePre = IERC20(tokenIn).balanceOf(address(ENSO_WEIROLL_WALLET_1));

            vm.prank(holder);
            IERC20(tokenIn).transfer(address(ENSO_WEIROLL_WALLET_1), amountIn);
            uint256 balancePost = IERC20(tokenIn).balanceOf(address(ENSO_WEIROLL_WALLET_1));

            if (balancePost - balancePre != amountIn) {
                revert EnsoWeirollWallet_Fork_Cartio_Test__BalancePostIsNotAmountIn(
                    tokenIn, amountIn, balancePre, balancePost
                );
            }
        }
    }

    function test_executeWeiroll_1() public {
        address[] memory tokensOut = s_tokensOut;
        uint256[] memory tokensOutBalancesPre = new uint256[](tokensOut.length);
        address[] memory tokensDust = s_tokensDust;
        uint256[] memory tokensDustBalancesPre = new uint256[](tokensDust.length);

        // --- Calculate balances before ---
        // Tokens out
        for (uint256 i = 0; i < tokensOut.length; i++) {
            tokensOutBalancesPre[i] = IERC20(tokensOut[i]).balanceOf(address(ENSO_WEIROLL_WALLET_1));
        }
        // Tokens dust
        for (uint256 i = 0; i < tokensDust.length; i++) {
            tokensDustBalancesPre[i] = IERC20(tokensDust[i]).balanceOf(address(ENSO_WEIROLL_WALLET_1));
        }

        // --- Execute shortcut ---
        vm.prank(ENSO_EOA_1);
        uint256 gasStart = gasleft();
        ENSO_WEIROLL_WALLET_1.executeWeiroll{ value: s_value }(s_commands, s_state);
        uint256 gasEnd = gasleft();

        // -- Log simulation results ---
        console2.log("**************************");
        console2.log("*** SIMULATION RESULTS ***");
        console2.log("**************************");
        // Tokens out
        console2.log("- Tokens Out -------------");
        for (uint256 i = 0; i < tokensOut.length; i++) {
            uint256 tokenOutBalancePost = IERC20(tokensOut[i]).balanceOf(address(ENSO_WEIROLL_WALLET_1));
            console2.log("* Addr: ", tokensOut[i]);
            console2.log("* Name: ", s_addressToLabel[tokensOut[i]]);
            console2.log("* Amount: ", tokenOutBalancePost - tokensOutBalancesPre[i]);
            console2.log("--------------------------");
        }
        console2.log("");

        // Tokens dust
        console2.log("- Tokens Dust ------------");
        for (uint256 i = 0; i < tokensDust.length; i++) {
            uint256 tokenDustBalancePost = IERC20(tokensDust[i]).balanceOf(address(ENSO_WEIROLL_WALLET_1));
            console2.log("* Addr: ", tokensDust[i]);
            console2.log("* Name: ", s_addressToLabel[tokensDust[i]]);
            console2.log("* Amount: ", tokenDustBalancePost - tokensDustBalancesPre[i]);
            console2.log("--------------------------");
        }
        console2.log("--- Gas ------------------");
        console2.log("* Used: ", gasStart - gasEnd);
        console2.log("**************************");
    }
}
