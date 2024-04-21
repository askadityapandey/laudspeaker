import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import CacheService from './cache.service';

describe('CacheService', () => {
  let cacheServicc: CacheService;

  beforeEach(() => {
    catsService = new CacheService();
  });

  describe('getSet', () => {
    it('should get from cache', async () => {
      // const result = ['test'];
      // jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      // expect(await catsController.findAll()).toBe(result);
    });
  });
});