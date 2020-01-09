import {EventEmitter, Injectable} from '@angular/core';
import Dexie from 'dexie';
import {Item} from '../models/item/item';
import {Auction} from '../modules/auction/models/auction.model';
import {AuctionUtil} from '../modules/auction/utils/auction.util';
import {SharedService} from './shared.service';
import {TSM} from '../modules/auction/models/tsm.model';
import {WoWUction} from '../modules/auction/models/wowuction.model';
import {PetsService} from './pets.service';
import {Pet} from '../modules/pet/models/pet';
import {Recipe} from '../modules/crafting/models/recipe';
import {environment} from '../../environments/environment';
import {Platform} from '@angular/cdk/platform';
import {TsmLuaUtil} from '../utils/tsm/tsm-lua.util';
import {ErrorReport} from '../utils/error-report.util';
import {AuctionsService} from './auctions.service';
import {NPC} from '../modules/npc/models/npc.model';
import {Zone} from '../modules/zone/models/zone.model';
import {BehaviorSubject} from 'rxjs';

/**
 * A Class for handeling the indexedDB
 */
@Injectable()
export class DatabaseService {
  private db: Dexie;

  readonly TSM_TABLE_COLUMNS = 'Id,Name,Level,VendorBuy,VendorSell,MarketValue,MinBuyout,HistoricalPrice,'
    + 'RegionMarketAvg,RegionMinBuyoutAvg,RegionHistoricalPrice,RegionSaleAvg,'
    + 'RegionAvgDailySold,RegionSaleRate';
  readonly WOWUCTION_TABLE_COLUMNS = 'id,mktPrice,avgDailyed,avgDailySold,estDemand,dailyPriceChange';
  readonly ITEM_TABLE_COLUMNS = 'id,name,icon,itemLevel,itemClass,itemSubClass,quality,itemSpells'
    + ',itemSource,buyPrice,sellPrice,itemBind,minFactionId,minReputation';
  readonly PET_TABLE_COLUMNS = 'speciesId,petTypeId,creatureId,name,icon,description,source';
  readonly AUCTIONS_TABLE_COLUMNS = 'auc,item,owner,ownerRealm,bid,buyout,quantity,timeLeft,rand,seed,context,realm,timestamp';
  readonly RECIPE_TABLE_COLUMNS = 'spellID,itemID,name,profession,rank,minCount,maxCount,reagents,expansion';
  readonly TSM_ADDON_HISTORY = 'timestamp,data';
  readonly NPC_TABLE_COLUMNS = 'id,name,zoneId,coordinates,sells,drops,skinning,' +
    'expansionId,isAlliance,isHorde,minLevel,maxLevel,tag,type,classification';
  readonly ZONE_TABLE_COLUMNS = 'id,name,patch,typeId,parentId,parent,territoryId,minLevel,maxLevel';
  databaseIsReady: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(public platform: Platform) {
    if (environment.test) {
      return;
    }
    this.db = new Dexie('wah-db');
    this.setDbVersions();
    this.db.open()
      .then(async (dx) => {
        const storageName = 'previousDBVersion';
        const previousVersion = localStorage.getItem(storageName);
        if (!previousVersion || +previousVersion < dx.verno) {
          // There might be a new schema in the DB model, so we should re-fetch all data to be safe
          await this.clearWowDataFromDB();
          localStorage.setItem(storageName, '' + dx.verno);
          console.log(`The database version is updated from schema ${previousVersion} to ${dx.verno}. Data is thus cleared.`);
        }
        this.databaseIsReady.next(true);
        console.log('wah-db successfully started');
      }).catch(error => {
      console.log('Unable to start indexedDB', error);
    });
  }

  addItems(items: Array<Item>): void {
    if (environment.test) {
      return;
    }
    this.db.table('items').bulkPut(items);
  }

  async getAllItems(): Dexie.Promise<any> {
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }

    SharedService.downloading.items = true;

    return new Dexie.Promise<any>(async (resolve) => {
      await this.getItemsInBatch(0, 50000);
      await this.getItemsInBatch(50001, 100000);
      await this.getItemsInBatch(100001, 200000);
      await this.getItemsInBatch(200001, 1000000);
      SharedService.events.items.emit(true);
      resolve();
    });
  }

  private getItemsInBatch(from: number, to: number) {
    return this.db.table('items')
      .where(':id')
      .between(from, to)
      .toArray()
      .then(items => {
        SharedService.downloading.items = false;
        SharedService.itemsUnmapped = SharedService.itemsUnmapped.concat(items);
        items.forEach(i => {
          SharedService.items[i.id] = i;
        });
      }).catch(e => {
        console.error('Could not restore items from local DB', e);
        SharedService.downloading.items = false;
      });
  }

  clearItems(): void {
    this.db.table('items').clear();
  }

  async addNPCs(list: NPC[]): Promise<void> {
    if (this.platform === null || this.platform.WEBKIT) {
      return;
    }
    await this.db.table('npcs').bulkPut(list);
  }

  async getAllNPCs(): Dexie.Promise<NPC[]> {
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }
    return this.db.table('npcs').toArray();
  }

  async clearNPCs(): Promise<void> {
    await this.db.table('npcs').clear();
  }

  async addZones(list: Zone[]): Promise<void> {
    if (this.platform === null || this.platform.WEBKIT) {
      return;
    }
    await this.db.table('zones').bulkPut(list);
  }

  async getAllZones(): Dexie.Promise<Zone[]> {
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }
    return this.db.table('zones').toArray();
  }

  async clearZones(): Promise<void> {
    await this.db.table('zones').clear();
  }

  addPets(pets: Array<Pet>): void {
    if (environment.test) {
      return;
    }
    this.db.table('pets').bulkPut(pets);
  }

  getAllPets(): Dexie.Promise<any> {
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }

    SharedService.downloading.pets = true;
    return this.db.table('pets')
      .toArray()
      .then(pets => {
        SharedService.downloading.pets = false;
        pets.forEach(i => {
          SharedService.pets[i.speciesId] = i;
        });
        console.log('Restored pets from local DB');
      }).catch(e => {
        console.error('Could not restore pets from local DB', e);
        SharedService.downloading.pets = false;
      });
  }

  clearPets(): void {
    this.db.table('pets').clear();
  }

  addRecipes(recipes: Array<Recipe>): void {
    if (environment.test || this.platform === null || this.platform.WEBKIT) {
      return;
    }
    this.db.table('recipes').bulkPut(recipes);
  }

  getAllRecipes(): Dexie.Promise<any> {
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }

    SharedService.downloading.recipes = true;
    return this.db.table('recipes')
      .toArray()
      .then(recipes => {
        SharedService.downloading.recipes = false;
        SharedService.recipes = recipes as Array<Recipe>;
        SharedService.events.recipes.emit(true);
        console.log('Restored recipes from local DB');
      }).catch(e => {
        console.error('Could not restore recipes from local DB', e);
        SharedService.downloading.recipes = false;
      });
  }

  clearRecipes(): void {
    this.db.table('recipes').clear();
  }


  addAuction(auction: Auction): void {
    if (environment.test || this.platform === null || this.platform.WEBKIT) {
      return;
    }
    this.db.table('auctions').add(auction)
      .then(r =>
        console.log('Successfully added auctions to local DB'))
      .catch(e =>
        console.error('Could not add auctions to local DB', e));
  }

  clearAuctions(): void {
    this.db.table('auctions').clear();
  }


  addAuctions(auctions: Array<Auction>): void {
    return; // Deactivated
    if (environment.test || this.platform === null || this.platform.WEBKIT) {
      return;
    }
    this.db.table('auctions').clear();
    this.db.table('auctions')
      .bulkAdd(auctions)
      .then(r => console.log('Successfully added auctions to local DB'))
      .catch(e => console.error('Could not add auctions to local DB', e));
  }

  addClassicAuctions(realmData: {realm: string, auctions: Auction[]}): void {
    if (this.platform === null || this.platform.WEBKIT) {
      return;
    }

    // this.db.table('classic-auctions').clear();
    this.db.table('classic-auctions')
      .put(realmData)
      .then(r => console.log('Successfully added auctions to local DB'))
      .catch(e => console.error('Could not add auctions to local DB', e));
  }

  async getAllAuctions(petService?: PetsService, auctionService?: AuctionsService): Dexie.Promise<any> {
    return; // Deactivated
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }

    SharedService.downloading.auctions = true;
    return this.db.table('auctions')
      .toArray()
      .then(auctions =>
        this.handleSuccessfulAuctionDBFetch(auctions, petService, auctionService))
      .catch(e => {
        console.error('Could not restore auctions from local DB', e);
        SharedService.downloading.auctions = false;
      });
  }

  async getClassicAuctions(realm: string, petService?: PetsService, auctionService?: AuctionsService): Dexie.Promise<any> {
    console.log('input to DB fetch', realm)
    SharedService.downloading.auctions = true;
    return this.db.table('classic-auctions')
      .where('realm')
      .equals(realm)
      .toArray()
      .then(realmData =>
        this.handleSuccessfulAuctionDBFetch(realmData[0].auctions, petService, auctionService))
      .catch(e => {
        console.error('Could not restore auctions from local DB', e);
        SharedService.downloading.auctions = false;
      });
  }

  private handleSuccessfulAuctionDBFetch(auctions: Auction[], petService: PetsService, auctionService: AuctionsService) {
    SharedService.downloading.auctions = false;
    AuctionUtil.organize(auctions, petService)
      .then(auctionItems => {
        auctionService.events.list.next(auctions);
        auctionService.events.groupedList.next(auctionItems);
      })
      .catch(error =>
        ErrorReport.sendError('getAllAuctions', error));
    console.log('Restored auctions from local DB');
    SharedService.events.auctionUpdate.emit();
  }

  addWoWUctionItems(wowuction: Array<WoWUction>): void {
    if (environment.test || this.platform === null || this.platform.WEBKIT) {
      return;
    }
    this.db.table('wowuction').clear();
    this.db.table('wowuction')
      .bulkPut(wowuction)
      .then(r => console.log('Successfully added WoWUction data to local DB'))
      .catch(e => console.error('Could not add WoWUction data to local DB', e));
  }

  getWoWUctionItems(): Dexie.Promise<any> {
    SharedService.downloading.wowUctionAuctions = true;
    return this.db.table('wowuction')
      .toArray()
      .then(wowuction => {
        (<WoWUction[]>wowuction).forEach(a => {
          SharedService.wowUction[a.id] = a;
        });
        SharedService.downloading.wowUctionAuctions = false;
        console.log('Restored WoWUction data from local DB');
      })
      .catch(e => {
        console.error('Could not restore WoWUction data', e);
        SharedService.downloading.wowUctionAuctions = false;
      });
  }

  addTSMAddonData(tsm: any, lastModified: Date): void {
    if (this.platform === null || this.platform.WEBKIT) {
      return;
    }

    this.db.table('tsmAddonHistory').clear();
    this.db.table('tsmAddonHistory')
      .put({
        timestamp: lastModified,
        data: tsm
      })
      .then(r => {
        localStorage['timestamp_tsm_addon_import'] = lastModified;
        console.log('Successfully added tsm addon history data to local DB');
      })
      .catch(error =>
        ErrorReport.sendError('DatabaseService.addTSMAddonData', error));
  }


  getTSMAddonData(): Dexie.Promise<any> {
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }

    return this.db.table('tsmAddonHistory')
      .toArray()
      .then(tsm => {
        if (!tsm[0]) {
          return;
        }
        new TsmLuaUtil().convertList(tsm[0].data);
        console.log('Restored TSM addon historical data from local DB');
      })
      .catch(e => {
        console.error('Could not restore TSM data', e);
        SharedService.downloading.tsmAuctions = false;
      });
  }

  addTSMItems(tsm: Array<TSM>): void {
    if (environment.test || this.platform === null || this.platform.WEBKIT) {
      return;
    }
    this.db.table('tsm').clear();
    this.db.table('tsm')
      .bulkPut(tsm)
      .then(r => console.log('Successfully added tsm data to local DB'))
      .catch(e => console.error('Could not add tsm data to local DB', e));
  }

  getTSMItems(): Dexie.Promise<any> {
    if (this.platform === null || this.platform.WEBKIT) {
      return new Dexie.Promise<any>((resolve, reject) => reject());
    }

    SharedService.downloading.tsmAuctions = true;
    return this.db.table('tsm')
      .toArray()
      .then(tsm => {
        (<TSM[]>tsm).forEach(a => {
          SharedService.tsm[a.Id] = a;
        });
        SharedService.downloading.tsmAuctions = false;
        console.log('Restored TSM data from local DB');
      })
      .catch(e => {
        console.error('Could not restore TSM data', e);
        SharedService.downloading.tsmAuctions = false;
      });
  }

  async clearWowDataFromDB(): Promise<void> {
    this.clearAuctions();
    this.clearItems();
    await this.clearNPCs();
    this.clearPets();
    this.clearRecipes();
    await this.clearZones();
  }

  deleteDB(): void {
    this.db.delete();
  }

  setDbVersions(): void {
    this.db.version(7).stores({
      'classic-auctions': 'realm,auctions',
      auctions: this.AUCTIONS_TABLE_COLUMNS,
      wowuction: this.WOWUCTION_TABLE_COLUMNS,
      tsm: this.TSM_TABLE_COLUMNS,
      items: this.ITEM_TABLE_COLUMNS,
      pets: this.PET_TABLE_COLUMNS,
      recipes: this.RECIPE_TABLE_COLUMNS,
      npcs: this.NPC_TABLE_COLUMNS,
      zones: this.ZONE_TABLE_COLUMNS,
      tsmAddonHistory: this.TSM_ADDON_HISTORY
    });

    this.db.version(6).stores({
      auctions: this.AUCTIONS_TABLE_COLUMNS,
      wowuction: this.WOWUCTION_TABLE_COLUMNS,
      tsm: this.TSM_TABLE_COLUMNS,
      items: this.ITEM_TABLE_COLUMNS,
      pets: this.PET_TABLE_COLUMNS,
      recipes: this.RECIPE_TABLE_COLUMNS,
      npcs: this.NPC_TABLE_COLUMNS,
      zones: this.ZONE_TABLE_COLUMNS,
      tsmAddonHistory: this.TSM_ADDON_HISTORY
    });

    this.db.version(5).stores({
      auctions: this.AUCTIONS_TABLE_COLUMNS,
      wowuction: this.WOWUCTION_TABLE_COLUMNS,
      tsm: this.TSM_TABLE_COLUMNS,
      items: this.ITEM_TABLE_COLUMNS,
      pets: this.PET_TABLE_COLUMNS,
      recipes: this.RECIPE_TABLE_COLUMNS,
      tsmAddonHistory: this.TSM_ADDON_HISTORY
    });
    this.db.version(4).stores({
      auctions: this.AUCTIONS_TABLE_COLUMNS,
      wowuction: this.WOWUCTION_TABLE_COLUMNS,
      tsm: this.TSM_TABLE_COLUMNS,
      items: this.ITEM_TABLE_COLUMNS,
      pets: this.PET_TABLE_COLUMNS,
      recipes: this.RECIPE_TABLE_COLUMNS
    });
    this.db.version(3).stores({
      auctions: this.AUCTIONS_TABLE_COLUMNS,
      wowuction: this.WOWUCTION_TABLE_COLUMNS,
      tsm: this.TSM_TABLE_COLUMNS,
      items: this.ITEM_TABLE_COLUMNS,
      pets: this.PET_TABLE_COLUMNS
    }).upgrade(() => {
      console.log('Upgraded db');
    });

    this.db.version(2).stores({
      auctions: this.AUCTIONS_TABLE_COLUMNS,
      wowuction: 'id,mktPrice,avgDailyPosted,avgDailySold,estDemand,realm',
      tsm: this.TSM_TABLE_COLUMNS,
      items: this.ITEM_TABLE_COLUMNS,
      pets: this.PET_TABLE_COLUMNS
    }).upgrade(() => {
      console.log('Upgraded db');
    });
    this.db.version(1).stores({
      auctions: this.AUCTIONS_TABLE_COLUMNS,
      wowuction: this.WOWUCTION_TABLE_COLUMNS,
      tsm: this.TSM_TABLE_COLUMNS,
      items: `id,name,icon,itemClass,itemSubClass,quality,itemSpells,itemSource`,
      pets: this.PET_TABLE_COLUMNS
    });
  }
}
