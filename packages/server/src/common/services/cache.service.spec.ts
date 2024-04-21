import { Test, TestingModule } from '@nestjs/testing';
import CacheService from './cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';


// jest.mock('cache-manager')
// to run: npm run test -- cache.service.spec --watch

describe('CacheService', () => {
  let cacheService: CacheService;

  // beforeEach(() => {
  //   cacheService = new CacheService();
  // });
  let service: CacheService;
  let cache: Cache;

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => 'any value',
            set: () => jest.fn(),
          },
        },
      ],
    })
    .compile();

    service = app.get<CacheService>(CacheService);
    cache = app.get(CACHE_MANAGER);
  });

  describe('getSet', () => {
    it('should get from cache', async () => {
      // const MockedCache = require('./monty-python')
       
      // no implementation specified, using the manual mock
      // jest.mock('./monty-python')

      // let value = await cacheService.getRaw("CacheService:getSet", async () => {
      //   return "getSetTest";
      // });

      // const result = ['test'];
      // jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      // expect(await catsController.findAll()).toBe(result);

      const spy = jest.spyOn(cache, 'get');

      let value = await service.getRaw("CacheService:getSet", async () => {
        return "getSetTest";
      });

      // await service.cacheSomething();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(value).toEqual("any value");
      // expect(spy.mock.calls[0][0]).toEqual('key');
      // expect(spy.mock.calls[0][1]).toEqual('value');
    });
  });
});