import {SharedService} from '../../../services/shared.service';
import {AuctionItem} from '../../auction/models/auction-item.model';
import {CraftingUtil} from './crafting.util';
import {TSM} from '../../auction/models/tsm.model';
import {Recipe} from '../models/recipe';
import {MockLoaderUtil} from '../../../mocks/mock-loader.util';

describe('CraftingUtil', () => {
  beforeAll(() => {
    new MockLoaderUtil().initBaseData();
    const recipe = new Recipe();

    SharedService.recipes.length = 0;
    SharedService.auctionItemsMap[10] = new AuctionItem();
    SharedService.auctionItemsMap[10].buyout = 20;
    SharedService.auctionItemsMap[11] = new AuctionItem();
    SharedService.auctionItemsMap[11].buyout = 10;
    SharedService.auctionItemsMap[12] = new AuctionItem();
    SharedService.auctionItemsMap[12].buyout = 30;
    SharedService.auctionItemsMap[20] = new AuctionItem();
    SharedService.auctionItemsMap[20].buyout = 10;
    SharedService.tsm[20] = {MarketValue: 100} as TSM;

    recipe.spellID = 1;
    recipe.itemID = 10;
    recipe.name = 'test recipe';
    recipe.profession = 'Software developer';
    recipe.minCount = 1;
    recipe.maxCount = 1;
    recipe.reagents = [];
    SharedService.recipes.push(recipe);
  });

  describe('Should be able to calculate cost', () => {
    it('for one reagent', () => {
      SharedService.recipes[0].reagents.push({
        itemID: 11,
        name: '',
        count: 3,
        dropped: false
      });
      CraftingUtil.calculateCost();
      expect(SharedService.recipes[0].cost).toEqual(30);
      expect(SharedService.recipes[0].roi).toEqual(-10);
    });

    it('for several reagents', () => {
      SharedService.recipes[0].reagents.push({
        itemID: 11,
        name: '',
        count: 3,
        dropped: false
      });
      SharedService.recipes[0].reagents.push({
        itemID: 12,
        name: '',
        count: 10,
        dropped: false
      });
      CraftingUtil.calculateCost();
      expect(SharedService.recipes[0].cost).toEqual(330);
      expect(SharedService.recipes[0].roi).toEqual(-310);
    });

    it('if some items aren\'t at AH', () => {
      SharedService.recipes[0].reagents.push({
        itemID: 1,
        name: '',
        count: 3,
        dropped: false
      });
      SharedService.recipes[0].reagents.push({
        itemID: 12,
        name: '',
        count: 10,
        dropped: false
      });
      CraftingUtil.calculateCost();
      expect(SharedService.recipes[0].cost).toEqual(300);
      expect(SharedService.recipes[0].roi).toEqual(-280);
    });

    it('if some items aren\'t at AH and use market value instead.', () => {
      // logic
      SharedService.user.apiToUse = 'tsm';
    });

    it('The item is above set limit, so use market value instead.', () => {
      // Buyout is 200% of MV
      SharedService.user.buyoutLimit = 200;
      SharedService.user.apiToUse = 'tsm';

      SharedService.recipes[0].reagents.push({
        itemID: 20, // 10
        name: '',
        count: 3, // sum=30
        dropped: false
      });
      SharedService.recipes[0].reagents.push({
        itemID: 12, // 30
        name: '',
        count: 10, // sum=300
        dropped: false
      });

      // 100
      SharedService.tsm[20].MarketValue = 15;
      CraftingUtil.calculateCost();
      expect(SharedService.recipes[0].cost).toEqual(180);
    });

    it('if some items aren\'t at AH and use avg sold for value instead.', () => {
      SharedService.user.apiToUse = 'tsm';
    });
  });

  describe('Disenchant crafting', () => {
  });
});
