import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main_ } from '../../scripts/simulateShortcut';

const MOCKED_PATH_TO_NODE = '/path/to/node';
const MOCKED_PATH_TO_SCRIPT = '/path/to/script';

describe('Successfully simulates shortcuts for', () => {
  beforeAll(() => {
    // Disable console methods during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe('abracadabra', () => {
    it('mim-honey', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'abracadabra',
        'honey-mim',
        '10000000,100000000',
        '--mode=forge',
        '--block=3443800',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '1',
        minAmountOutHex: '0x01',
        quote: { '0x150683BF3f0a344e271fc1b7dac3783623e7208A': '271725' },
        dust: {
          '0x08B918dD18E087893bb9d711d9E0BBaA7a63Ef63': '16',
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '99600399',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
        },
        gas: '1443602',
      });
    });

    it('mim-honey (with slippage)', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'abracadabra',
        'honey-mim',
        '10000000,100000000',
        '--mode=forge',
        '--slippage=3',
        '--block=3443800',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '271643',
        minAmountOutHex: '0x04251b',
        quote: { '0x150683BF3f0a344e271fc1b7dac3783623e7208A': '271725' },
        dust: {
          '0x08B918dD18E087893bb9d711d9E0BBaA7a63Ef63': '16',
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '99600399',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
        },
        gas: '1443602',
      });
    });
  });

  describe('beraborrow', () => {
    it.skip('nect-honey', async () => {});

    it.skip('nect-honey (with slippage)', async () => {});

    it('sbtc-vault', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'beraborrow',
        'sbtc-vault',
        '10000000',
        '--mode=forge',
        '--block=3444841',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0x2A280f6769Ba2a254C3D1FeCef0280F87DB0a265': '10000000' },
        dust: { '0x5d417e7798208E9285b5157498bBF23A23E421E7': '0' },
        gas: '268575',
      });
    });

    it('weth-vault', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'beraborrow',
        'weth-vault',
        '100000000000',
        '--mode=forge',
        '--block=3444966',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xEdB3CD4f17b20b69Cd7bf8c1126E2759e4A710Be': '100000000000' },
        dust: { '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0' },
        gas: '268242',
      });
    });
  });

  describe('burrbear', () => {
    it('usdc-vault', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'burrbear',
        'usdc-vault',
        '100000000',
        '--mode=forge',
        '--block=3445254',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0xFbb99BAD8eca0736A9ab2a7f566dEbC9acb607f0': '99933244415981602324',
        },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '840782',
      });
    });
  });

  describe('concrete', () => {
    it('usdc-vault', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'concrete',
        'usdc-vault',
        '100000000',
        '--mode=forge',
        '--block=3445321',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0x9c5285F076C6c1D8471E2625aB5c2257547bCe86': '100000000000000000',
        },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '351959',
      });
    });

    it('wbtc-vault', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'concrete',
        'wbtc-vault',
        '100000000',
        '--mode=forge',
        '--block=3445478',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0x18AA409860b89353172C5A7fF4f5fd28a19f3c5a': '100000000000000000',
        },
        dust: { '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0' },
        gas: '348086',
      });
    });

    it('weth-vault', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'concrete',
        'weth-vault',
        '100000000',
        '--mode=forge',
        '--block=3445524',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0x18AA409860b89353172C5A7fF4f5fd28a19f3c5a': '100000000000000000',
        },
        dust: { '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0' },
        gas: '348086',
      });
    });
  });

  describe('d2', () => {
    it('usdc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'd2',
        'usdc',
        '100000000',
        '--mode=forge',
        '--block=3445662',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xa4869CbdC3Bc1B71b7C29e642207bb9439Ac05ba': '100000000' },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '296309',
      });
    });
  });

  describe('dahlia', () => {
    it('usdc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'dahlia',
        'usdc',
        '100000000',
        '--mode=forge',
        '--block=3445762',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0x95B0de63dbbe5D92BD05B7c0C12A32673f490A42': '100000000000000' },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '336553',
      });
    });

    it('weth', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'dahlia',
        'weth',
        '100000000000000',
        '--mode=forge',
        '--block=3445824',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0x479Df3548C4261Cb101BE33536B3D90CCA6eb327': '100000000000000000000',
        },
        dust: { '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0' },
        gas: '333928',
      });
    });
  });

  describe('dolomite', () => {
    it('deth', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'dolomite',
        'deth',
        '100000000000000',
        '--mode=forge',
        '--block=3490796',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xf7b5127B510E568fdC39e6Bb54e2081BFaD489AF': '100000000000000' },
        dust: { '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0' },
        gas: '561758',
      });
    });

    it('dhoney', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'dolomite',
        'dhoney',
        '100000000000000',
        '--mode=forge',
        '--block=3490928',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0x7f2B60fDff1494A0E3e060532c9980d7fad0404B': '99800000000000000000000000',
        },
        dust: {
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
        },
        gas: '883066',
      });
    });

    it('dusdc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'dolomite',
        'dusdc',
        '100000000000000',
        '--mode=forge',
        '--block=3490975',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0x444868B6e8079ac2c55eea115250f92C2b2c4D14': '100000000000000' },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '554748',
      });
    });

    it('dusdt', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'dolomite',
        'dusdt',
        '100000000000000',
        '--mode=forge',
        '--block=3491008',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xF2d2d55Daf93b0660297eaA10969eBe90ead5CE8': '100000000000000' },
        dust: { '0x164A2dE1bc5dc56F329909F7c97Bae929CaE557B': '0' },
        gas: '593079',
      });
    });

    it('dwbtc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'dolomite',
        'dwbtc',
        '100000000000000',
        '--mode=forge',
        '--block=3491079',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0x29cF6e8eCeFb8d3c9dd2b727C1b7d1df1a754F6f': '100000000000000' },
        dust: { '0xFa5bf670A92AfF186E5176aA55690E0277010040': '0' },
        gas: '578873',
      });
    });
  });

  describe('fortunafi', () => {
    it.skip('rusd-honey', async () => {});

    it.skip('rusd-honey (with slippage)', async () => {});
  });

  describe('goldilocks', () => {
    it.skip('ebtc', async () => {});

    it.skip('unibtc', async () => {});

    it.skip('weeth', async () => {});
  });

  describe('infrared', () => {
    it('weth-wbtc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'infrared',
        'weth-wbtc',
        '1000000000,100000',
        '--mode=forge',
        '--block=3491563',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xe1e4F5b13F6E87140A657222BB9D38B78ad00bf8': '2798' },
        dust: {
          '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '206540',
          '0xFa5bf670A92AfF186E5176aA55690E0277010040': '99999',
          '0x1E5FFDC9B4D69398c782608105d6e2B724063E13': '0',
        },
        gas: '1107611',
      });
    });
  });

  describe('kodiak', () => {
    it('honey-usdc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'kodiak',
        'honey-usdc',
        '100000000',
        '--mode=forge',
        '--block=3491718',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '1',
        minAmountOutHex: '0x01',
        quote: { '0x7b26b6C57014eAaA4042FfCF7c701E38F4bc2c5C': '41305286436538' },
        dust: {
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '17249117',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
        },
        gas: '1388164',
      });
    });

    it('honey-usdc (with slippage)', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'kodiak',
        'honey-usdc',
        '100000000',
        '--mode=forge',
        '--slippage=3',
        '--block=3491718',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '41292894850607',
        minAmountOutHex: '0x258e40544e2f',
        quote: { '0x7b26b6C57014eAaA4042FfCF7c701E38F4bc2c5C': '41305286436538' },
        dust: {
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '17249117',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
        },
        gas: '1388164',
      });
    });

    it('honey-weth', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'kodiak',
        'honey-weth',
        '100000000,1000000',
        '--mode=forge',
        '--block=3491974',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '1',
        minAmountOutHex: '0x01',
        quote: { '0xD4570a738675fB2c31e7b7b88998EE73E9E17d49': '11096881816' },
        dust: {
          '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0',
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '996002',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
        },
        gas: '1363035',
      });
    });

    it('honey-weth (with slippage)', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'kodiak',
        'honey-weth',
        '100000000,1000000',
        '--mode=forge',
        '--slippage=3',
        '--block=3491974',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '11093552751',
        minAmountOutHex: '0x02953a2e6f',
        quote: { '0xD4570a738675fB2c31e7b7b88998EE73E9E17d49': '11096881816' },
        dust: {
          '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0',
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '996002',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
        },
        gas: '1363035',
      });
    });

    it('weth-wbtc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'kodiak',
        'weth-wbtc',
        '1000000000,100000',
        '--mode=forge',
        '--block=3492136',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '1',
        minAmountOutHex: '0x01',
        quote: { '0x1E5FFDC9B4D69398c782608105d6e2B724063E13': '2798' },
        dust: {
          '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '206540',
          '0xFa5bf670A92AfF186E5176aA55690E0277010040': '99999',
        },
        gas: '971870',
      });
    });

    it('weth-wbtc (with slippage)', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'kodiak',
        'weth-wbtc',
        '1000000000,100000',
        '--mode=forge',
        '--slippage=3',
        '--block=3492136',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0x79141B00251E4E08D5463e4e0622E4065692fB3B',
        minAmountOut: '2797',
        minAmountOutHex: '0x0aed',
        quote: { '0x1E5FFDC9B4D69398c782608105d6e2B724063E13': '2798' },
        dust: {
          '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '206540',
          '0xFa5bf670A92AfF186E5176aA55690E0277010040': '99999',
        },
        gas: '971870',
      });
    });
  });

  describe('moby', () => {
    it('spv-usdc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'moby',
        'spv-usdc',
        '100000000000000',
        '--mode=forge',
        '--block=3492354',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0xC4E80693F0020eDA0a7500d6edE12Ebb5FDf4526': '99899871119119404542637118',
        },
        dust: {
          '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0',
          '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0',
          '0xF7F214A9543c1153eF5DF2edCd839074615F248c': '0',
        },
        gas: '1825870',
      });
    });

    it('wolp-honey', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'moby',
        'wolp-honey',
        '100000000000000',
        '--mode=forge',
        '--block=3492413',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xa05cb6a41305002e628deaF6210Bf5a7DFD1D099': '100926111008107' },
        dust: { '0xd137593CDB341CcC78426c54Fb98435C60Da193c': '0' },
        gas: '945365',
      });
    });

    it('wolp-usdc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'moby',
        'wolp-usdc',
        '1000000000',
        '--mode=forge',
        '--block=3492695',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0xa05cb6a41305002e628deaF6210Bf5a7DFD1D099': '1009275354389148943119',
        },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '942104',
      });
    });

    it('wolp-wbtc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'moby',
        'wolp-wbtc',
        '1000000000',
        '--mode=forge',
        '--block=3492741',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0xa05cb6a41305002e628deaF6210Bf5a7DFD1D099': '970143461044107598817178',
        },
        dust: { '0xFa5bf670A92AfF186E5176aA55690E0277010040': '0' },
        gas: '946510',
      });
    });

    it('wolp-weth', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'moby',
        'wolp-weth',
        '1000000000',
        '--mode=forge',
        '--block=3492793',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xa05cb6a41305002e628deaF6210Bf5a7DFD1D099': '3488786706570' },
        dust: { '0x2d93FbcE4CffC15DD385A80B3f4CC1D4E76C38b3': '0' },
        gas: '919290',
      });
    });
  });

  describe('origami', () => {
    it('oboy-honey', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'origami',
        'oboy-honey',
        '10000000',
        '--mode=forge',
        '--block=3492994',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: {
          '0x9d98B51B3F0E085c7BDf33f26D273B6e277a27B8': '10000000000000000000',
        },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '252645',
      });
    });
  });

  describe('satlayer', () => {
    it('pumpbtc', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'satlayer',
        'pumpbtc',
        '10000000',
        '--mode=forge',
        '--block=3493063',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0x052335D631356f4b63457c1796f5a3786e8160ad': '10000000' },
        dust: { '0x49a49AB0A048bCADB8b4E51c5c970C46bF889CCD': '0' },
        gas: '306088',
      });
    });
  });

  describe('thj', () => {
    it('usdc-vault', async () => {
      // Arrange
      const args = [
        MOCKED_PATH_TO_NODE,
        MOCKED_PATH_TO_SCRIPT,
        'cartio',
        'thj',
        'usdc-vault',
        '10000000',
        '--mode=forge',
        '--block=3493135',
      ];
      process.argv = args;

      // Act
      const report = await main_(args);

      // Assert
      expect(report).toMatchObject({
        weirollWallet: '0xBa8F5f80C41BF5e169d9149Cd4977B1990Fc2736',
        minAmountOut: undefined,
        minAmountOutHex: undefined,
        quote: { '0xE9e4E48dab982b805Ca3C80122df078B35454116': '10000000010000000' },
        dust: { '0x015fd589F4f1A33ce4487E12714e1B15129c9329': '0' },
        gas: '303383',
      });
    });
  });

  afterAll(() => {
    // Restore original methods after tests
    vi.restoreAllMocks();
  });
});
