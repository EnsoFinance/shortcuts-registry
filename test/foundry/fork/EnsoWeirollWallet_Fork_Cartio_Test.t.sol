// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IERC20 } from "@openzeppelin-contracts-5.1.0/interfaces/IERC20.sol";
import { Test } from "forge-std-1.9.4//Test.sol";
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

    // --- Known addresses ---
    // Enso accounts
    address private constant ENSO_EOA_1 = 0x93621DCA56fE26Cdee86e4F6B18E116e9758Ff11;
    // Enso contracts
    address private constant ENSO_ROUTER_1 = 0x80EbA3855878739F4710233A8a19d89Bdd2ffB8E;
    address private constant ENSO_SHORTCUTS_1 = 0x7d585B0e27BBb3D981b7757115EC11F47c476994;
    address private constant ENSO_DELEGATE_1 = 0x38147794FF247e5Fc179eDbAE6C37fff88f68C52;
    address private constant ROYCO_WALLET_HELPERS_1 = 0x07899ac8BE7462151d6515FCd4773DD9267c9911;
    IWeirollWallet private constant ENSO_WEIROLL_WALLET_1 = IWeirollWallet(0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736);

    // --- Tokens (more at: https://80000.testnet.routescan.io/tokens) ---
    // Single tokens
    IERC20 private constant ERC20_aUSDT = IERC20(0x164A2dE1bc5dc56F329909F7c97Bae929CaE557B);
    IERC20 private constant ERC20_BGT = IERC20(0x289274787bAF083C15A45a174b7a8e44F0720660);
    IERC20 private constant ERC20_BURR = IERC20(0x1aF00782F74DdC4c7fCEFe8752113084FEBCDA45);
    IERC20 private constant ERC20_HONEY = IERC20(0xd137593CDB341CcC78426c54Fb98435C60Da193c);
    IERC20 private constant ERC20_MIM = IERC20(0x08B918dD18E087893bb9d711d9E0BBaA7a63Ef63);
    IERC20 private constant ERC20_NECTAR = IERC20(0xefEeD4d987F6d1dE0f23D116a578402456819C28);
    IERC20 private constant ERC20_rUSD = IERC20(0x254e3D5F964E770F3a51a19d809bcE36308d797d);
    IERC20 private constant ERC20_STONE = IERC20(0x1da4dF975FE40dde074cBF19783928Da7246c515);
    IERC20 private constant ERC20_USDC = IERC20(0x015fd589F4f1A33ce4487E12714e1B15129c9329);
    IERC20 private constant ERC20_WBERA = IERC20(0x6969696969696969696969696969696969696969);
    IERC20 private constant ERC20_WBTC = IERC20(0xFa5bf670A92AfF186E5176aA55690E0277010040);
    IERC20 private constant ERC20_WETH = IERC20(0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3);
    // LP tokens
    IERC20 private constant ERC20_50WBERA_50HONEY_WEIGHTED = IERC20(0x3aD1699779eF2c5a4600e649484402DFBd3c503C);
    IERC20 private constant ERC20_80WBERA_20USDC_WEIGHTED = IERC20(0x4f9D20770732F10dF42921EFfA62eb843920a48A);
    IERC20 private constant ERC20_USDC_HONEY_COMPOSABLESTABLE = IERC20(0xF7F214A9543c1153eF5DF2edCd839074615F248c);
    IERC20 private constant ERC20_USDT_HONEY_COMPOSABLESTABLE = IERC20(0xA694a92a1e23b8AaEE6b81EdF5302f7227e7F274);

    // --- Shortcut ---
    bytes32[] private s_commands;
    bytes[] private s_state;
    uint256 private s_value;
    address[] private s_tokensIn;
    uint256[] private s_amountsIn;

    // --- Players ---
    address private constant WHALE_1 = 0xCACa41c458f48D4d7c710F2E62AEe931E149A37d; // USDC, aUSDT
    mapping(IERC20 token => address whale) private s_tokenToWhale;

    // --- Custom Errors ---
    error EnsoWeirollWallet_Fork_Cartio_Test__ArrayLengthsAreNotEq(
        string array1Name, uint256 array1Length, string array2Name, uint256 array2Length
    );
    error EnsoWeirollWallet_Fork_Cartio_Test__BalancePostIsNotAmountIn(
        address tokenIn, uint256 amountIn, uint256 balancePre, uint256 balancePost
    );
    error EnsoWeirollWallet_Fork_Cartio_Test__TokenInWhaleNotFound(address tokenIn);

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
        if (tokensIn.length != amountsIn.length) {
            revert EnsoWeirollWallet_Fork_Cartio_Test__ArrayLengthsAreNotEq(
                "s_tokensIn", s_tokensIn.length, "s_amountsIn", s_amountsIn.length
            );
        }

        s_tokensIn = tokensIn;
        s_amountsIn = amountsIn;

        // --- Set labels ---
        // Enso EOA
        vm.label(ENSO_EOA_1, "Enso_EOA_1");
        // Enso contracts
        vm.label(ENSO_ROUTER_1, "Enso_Router_1");
        vm.label(ENSO_SHORTCUTS_1, "Enso_Shortcuts_1");
        vm.label(ENSO_DELEGATE_1, "Enso_Delegate_1");
        vm.label(ROYCO_WALLET_HELPERS_1, "Royco_Wallet_Helpers_1");
        vm.label(address(ENSO_WEIROLL_WALLET_1), "Enso_Weiroll_Wallet_1");
        // Tokens
        vm.label(address(ERC20_BGT), "ERC20:BGT");
        vm.label(address(ERC20_HONEY), "ERC20:HONEY");
        vm.label(address(ERC20_USDC), "ERC20:USDC");
        vm.label(address(ERC20_WETH), "ERC20:WETH");
        // Players
        vm.label(WHALE_1, "Whale_1"); // Tokens: USDC, aUSDT

        // --- Track token whales ---
        // Single tokens
        s_tokenToWhale[ERC20_aUSDT] = 0xCACa41c458f48D4d7c710F2E62AEe931E149A37d;
        s_tokenToWhale[ERC20_BGT] = 0x211bE45338B7C6d5721B5543Eb868547088Aca39;
        s_tokenToWhale[ERC20_BURR] = 0x5B34eBA09e567d37884c0AA58509119c87Bfb589;
        s_tokenToWhale[ERC20_HONEY] = 0x3869E8A2A1432D09666f87b9E61FBf6f71eb6c75;
        s_tokenToWhale[ERC20_MIM] = 0xB734c264F83E39Ef6EC200F99550779998cC812d;
        s_tokenToWhale[ERC20_NECTAR] = 0xFcfFb8913d44D21fEF23a3fEA04271919f25fBE1;
        s_tokenToWhale[ERC20_rUSD] = 0xA51C5F0007d8C506E9F7132dF10d637379a07be0;
        s_tokenToWhale[ERC20_STONE] = 0xAfa6405c1ea4727a0f9AF9096bD20A1E6d19C153;
        s_tokenToWhale[ERC20_USDC] = 0xCACa41c458f48D4d7c710F2E62AEe931E149A37d;
        s_tokenToWhale[ERC20_WBERA] = 0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33;
        s_tokenToWhale[ERC20_WBTC] = 0x603C6152DF404CB5250Ce8E6FE01e4294254F728;
        s_tokenToWhale[ERC20_WETH] = 0x8a73D1380345942F1cb32541F1b19C40D8e6C94B;
        // LP tokens
        s_tokenToWhale[ERC20_50WBERA_50HONEY_WEIGHTED] = 0x0cc03066a3a06F3AC68D3A0D36610F52f7C20877;
        s_tokenToWhale[ERC20_80WBERA_20USDC_WEIGHTED] = 0x3869E8A2A1432D09666f87b9E61FBf6f71eb6c75;
        s_tokenToWhale[ERC20_USDC_HONEY_COMPOSABLESTABLE] = 0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33;
        s_tokenToWhale[ERC20_USDT_HONEY_COMPOSABLESTABLE] = 0x9C8a5c82e797e074Fe3f121B326b140CEC4bcb33;

        // --- Fund addresses ---
        vm.deal(ENSO_EOA_1, 1000 ether);

        for (uint256 i = 0; i < tokensIn.length; i++) {
            address tokenIn = tokensIn[i];
            uint256 amountIn = amountsIn[i];
            uint256 balancePre = IERC20(tokenIn).balanceOf(ENSO_EOA_1);
            address tokenInWhale = s_tokenToWhale[IERC20(tokenIn)];

            if (tokenInWhale == address(0)) {
                revert EnsoWeirollWallet_Fork_Cartio_Test__TokenInWhaleNotFound(tokenIn);
            }

            vm.prank(tokenInWhale);
            IERC20(tokenIn).transfer(ENSO_EOA_1, amountIn);
            uint256 balancePost = IERC20(tokenIn).balanceOf(ENSO_EOA_1);

            if (balancePost - balancePre != amountIn) {
                revert EnsoWeirollWallet_Fork_Cartio_Test__BalancePostIsNotAmountIn(
                    tokenIn, amountIn, balancePre, balancePost
                );
            }
        }
    }

    function test_executeWeiroll_1() public {
        vm.prank(ENSO_EOA_1);
        bytes[] memory data = ENSO_WEIROLL_WALLET_1.executeWeiroll{ value: s_value }(s_commands, s_state);

        assertTrue(data.length > 0);
    }
}
