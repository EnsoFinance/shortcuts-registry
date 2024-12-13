// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import { IERC20 } from '@openzeppelin-contracts-5.1.0/interfaces/IERC20.sol';
import { Test } from 'forge-std-1.9.4//Test.sol';
import { IWeirollWallet } from 'test-helpers/interfaces/IWeirollWallet.sol';

contract EnsoWeirollWallet_Fork_Cartio_Test is Test {
  // --- Network environment variables ---
  int256 private constant SIMULATION_BLOCK_NUMBER_LATEST = -1;
  string private constant SIMULATION_CHAIN_ID = 'SIMULATION_CHAIN_ID';
  string private constant SIMULATION_RPC_URL = 'SIMULATION_RPC_URL';
  string private constant SIMULATION_BLOCK_NUMBER = 'SIMULATION_BLOCK_NUMBER';

  // --- Simulation calldata environment variables --
  string private constant SIMULATION_JSON_CALLDATA_ENV_VAR = 'SIMULATION_JSON_CALLDATA';
  string private constant SIMULATION_JSON_CALLDATA_KEY_COMMANDS = '.commands';
  string private constant SIMULATION_JSON_CALLDATA_KEY_STATE = '.state';
  string private constant SIMULATION_JSON_CALLDATA_KEY_VALUE = '.value';

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
  IERC20 private constant ERC20_aUSDT = IERC20(0x164A2dE1bc5dc56F329909F7c97Bae929CaE557B);
  IERC20 private constant ERC20_BGT = IERC20(0x289274787bAF083C15A45a174b7a8e44F0720660);
  IERC20 private constant ERC20_HONEY = IERC20(0xd137593CDB341CcC78426c54Fb98435C60Da193c);
  IERC20 private constant ERC20_USDC = IERC20(0x015fd589F4f1A33ce4487E12714e1B15129c9329);
  IERC20 private constant ERC20_WETH = IERC20(0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3);

  // --- Players ---
  address private constant WHALE_1 = 0xCACa41c458f48D4d7c710F2E62AEe931E149A37d; // USDC, aUSDT

  // --- Shortcut ---
  bytes32[] private s_commands;
  bytes[] private s_state;
  uint256 private s_value;

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

    // --- Set labels ---
    // Enso EOA
    vm.label(ENSO_EOA_1, 'Enso_EOA_1');
    // Enso contracts
    vm.label(ENSO_ROUTER_1, 'Enso_Router_1');
    vm.label(ENSO_SHORTCUTS_1, 'Enso_Shortcuts_1');
    vm.label(ENSO_DELEGATE_1, 'Enso_Delegate_1');
    vm.label(ROYCO_WALLET_HELPERS_1, 'Royco_Wallet_Helpers_1');
    vm.label(address(ENSO_WEIROLL_WALLET_1), 'Enso_Weiroll_Wallet_1');
    // Tokens
    vm.label(address(ERC20_BGT), 'ERC20:BGT');
    vm.label(address(ERC20_HONEY), 'ERC20:HONEY');
    vm.label(address(ERC20_USDC), 'ERC20:USDC');
    vm.label(address(ERC20_WETH), 'ERC20:WETH');
    // Players
    vm.label(WHALE_1, 'Whale_1');

    // -- Fund addresses ---
    vm.startPrank(WHALE_1);
    ERC20_aUSDT.transfer(ENSO_EOA_1, 10_000_000e6);
    ERC20_USDC.transfer(ENSO_EOA_1, 10_000_000e6);
    vm.stopPrank();
  }

  function test_executeWeiroll_1() public {
    vm.prank(ENSO_EOA_1);
    bytes[] memory data = ENSO_WEIROLL_WALLET_1.executeWeiroll{ value: s_value }(s_commands, s_state);
    assertTrue(data.length > 0);
  }
}
