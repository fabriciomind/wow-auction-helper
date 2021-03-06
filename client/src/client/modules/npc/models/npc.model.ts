import {AuctionItem} from '../../auction/models/auction-item.model';
import {SharedService} from '../../../services/shared.service';
import {Item} from '../../../models/item/item';
import {TSM} from '../../auction/models/tsm.model';
import {TradeVendor, TradeVendorItem} from '../../../models/item/trade-vendor';
import {TRADE_VENDORS} from '../../../data/trade-vendors';
import {Currency} from '../../core/models/currency.model';
import {currency, currencyMap} from '../../../data/currency.data';
import {Report} from '../../../utils/report.util';
import {CraftingService} from '../../../services/crafting.service';

export class VendorItem {
  id: number;
  price: number;
  unitPrice: number;
  currency: number;
  stock: number;
  stackSize: number;
}

export class DroppedItem {
  id: number;
  dropped: number;
  outOf: number;
  dropChance: number;

  static getScoredItem(dropped: DroppedItem) {
    const item: Item = SharedService.items[dropped.id],
      auctionItem: AuctionItem = SharedService.auctionItemsMap[dropped.id],
      tsmItem: TSM = SharedService.tsm[dropped.id],
      buyout = auctionItem ? auctionItem.buyout : 0,
      vendorValue = item ? item.sellPrice * dropped.dropChance : 0,
      buyoutValue = buyout * dropped.dropChance,
      saleRate = tsmItem ? tsmItem.RegionSaleRate : 0,
      mktValue = tsmItem ? tsmItem.MarketValue || tsmItem.RegionMarketAvg : 0,
      score = (vendorValue / buyoutValue) * 100;

    return {
      id: dropped.id,
      name: item ? item.name : '',
      dropChance: dropped.dropChance,
      vendorValue,
      sellPrice: item ? item.sellPrice : 0,
      buyoutValue,
      buyout,
      saleRate,
      mktValue,
      score
    };
  }

  private static getScore(vendorValue: number, buyoutValue: number, saleRate: number, mktValue: number, avgDailySold: number) {
    if (saleRate && mktValue) {
      let goldValue = vendorValue;
      if (vendorValue < buyoutValue) {
        goldValue = (buyoutValue / mktValue < 3 ? buyoutValue : mktValue) / 1000000;
      }
      return goldValue * (avgDailySold * saleRate);
    }
    return 0;
  }
}

export class SkinnedItem {
  id: number;
  count: number;
  dropChance: number;
}

export class NPC {
  id: number;
  name: string;
  zoneId: number;
  coordinates: Coordinates[] = [];
  sells: VendorItem[] = [];
  drops: DroppedItem[] = [];
  skinning: SkinnedItem[] = [];
  expansionId?: number;
  isAlliance: boolean;
  isHorde: boolean;
  minLevel?: number;
  maxLevel?: number;
  tag: string;
  type: number;
  classification: number;
  avgGoldDrop: number;

  static calculateValueOfDrops(drops: DroppedItem[]) {
    let buyoutValue = 0, score = 0, vendorValue = 0;
    if (drops) {
      drops.forEach(item => {
        const scored = DroppedItem.getScoredItem(item);
        score += scored.score;
        buyoutValue = scored.buyoutValue;
        vendorValue = scored.vendorValue;
      });
    }

    return {
      vendorValue,
      buyoutValue,
      score
    };
  }

  static calculateVendorValue(sells: VendorItem[]) {
    let limitedSupplyCount = 0, roi = 0;
    if (sells) {
      sells.forEach(item => {
        if (item.stock > 0) {
          limitedSupplyCount++;
        }
        if (!item.unitPrice || item.unitPrice === 0) {
          item.unitPrice = item.price / item.stackSize;
        }
        roi = this.calculateSellerVendorItemROI(item, roi).roi;
      });
    }

    return {
      limitedSupplyCount, roi
    };
  }

  static calculateSellerVendorItemROI(item: VendorItem, roi: number = 0) {
    const auctionItem: AuctionItem = SharedService.auctionItemsMap[item.id],
      tsm: TSM = SharedService.tsm[item.id],
      currencyAuctionItem: AuctionItem = SharedService.auctionItemsMap[item.currency];
    const unitPrice = currencyAuctionItem ?
      (currencyAuctionItem.buyout || currencyAuctionItem.regionSaleAvg) * item.unitPrice : item.unitPrice;
    if (auctionItem && unitPrice < auctionItem.buyout) {
      roi += auctionItem.buyout - unitPrice;
    } else if (!auctionItem && tsm && unitPrice < tsm.RegionMarketAvg) {
      roi += tsm.RegionMarketAvg - unitPrice;
    }
    return {
      roi,
      buyout: auctionItem && auctionItem.buyout || 0
    };
  }

  static getTradeVendorsAndSetUnitPriceIfMissing(list: NPC[]): void {
    const tradeVendorsItemMap = {},
      tradeVendorItemMap = {},
      npcVendorMap = {};
    TRADE_VENDORS.length = 0;
    const missingIds = {};
    list.forEach(npc => {
      if (!this.isFactionMatch(npc)) {
        return;
      }
      if (npc.sells && npc.sells.length) {
        const locale = localStorage.getItem('locale') || 'en_GB';
        npc.sells.forEach(item => {
          const i: Item = SharedService.items[item.currency];
          this.setUnitPrice(item);
          if (item.currency && (!i || i && i.itemClass !== 4)) {
            const currency: Currency = currencyMap.get(item.currency);
            const garrisonResourceIdExtra = item.currency === 824 ? '' + npc.id : '';
            const id = `${item.currency}${item.id}${garrisonResourceIdExtra}`,
              npcId = `${item.currency}${npc.id}${garrisonResourceIdExtra}`,
              tradeVendorId = item.currency + garrisonResourceIdExtra;
            let tradeVendor: TradeVendor = tradeVendorsItemMap[tradeVendorId];
            if (!tradeVendor) {
              if (!i) {
                missingIds[item.currency] = item.currency;
              }
              tradeVendor = new TradeVendor();
              tradeVendor.itemID = item.currency;
              tradeVendor.name = garrisonResourceIdExtra.length ?
                `${npc.name} (${currency && currency.name[locale]})` :
                (currency && currency.name[locale] || npc.name) + '- ' + item.currency;
              tradeVendor.items = [];
              tradeVendor.expansionId = npc.expansionId;
              tradeVendor.useForCrafting = i && i.itemBind !== 0;
              tradeVendorsItemMap[tradeVendorId] = tradeVendor;
              TRADE_VENDORS.push(tradeVendor);
            }

            if (!tradeVendorItemMap[id]) {
              tradeVendor.items.push(new TradeVendorItem(item.id, item.stackSize / item.price));
              tradeVendorItemMap[id] = true;
            }
            if (!npcVendorMap[npcId]) {
              tradeVendor.vendors.push(npc);
              npcVendorMap[npcId] = true;
            }
          }
        });
      }

      TRADE_VENDORS.sort((a, b) => b.expansionId - a.expansionId);
    });

    if (Object.keys(missingIds).length) {
      Report.debug('Missing NPC item currencies', Object.keys(missingIds).map(k => +k));
    }
  }

  private static setUnitPrice(item: VendorItem) {
    if (!item.unitPrice || item.unitPrice === 0 && item.price > 0) {
      item.unitPrice = item.price / item.stackSize;
    }
  }

  private static isFactionMatch(npc: NPC) {
    if (npc.isAlliance && SharedService.user.faction === 0) {
      return true;
    }
    return npc.isHorde && SharedService.user.faction === 1;
  }
}
