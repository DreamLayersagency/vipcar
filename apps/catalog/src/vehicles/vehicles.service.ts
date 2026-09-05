import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type {
  GetVehicleDto,
  ListVehiclesAdminDto,
  ListVehiclesDto,
  PaginationMetaDto,
  UpsertVehicleDto,
  VehicleModelDto,
} from '@vipcar/contracts';
import type {
  Transmission,
  VehicleCategory,
  VehicleModel,
  VehicleTier,
} from '../../generated/prisma';
import { PrismaService } from '../prisma.service';

const CATEGORY_TO_LABEL: Record<VehicleCategory, VehicleModelDto['category']> = {
  Luxury: 'Luxury',
  SUV: 'SUV',
  Sedan: 'Sedan',
  VanAndGroup: 'Van & Group',
  Compact: 'Compact',
  Economy: 'Economy',
  PickUp: 'Pick-up',
};

const LABEL_TO_CATEGORY: Record<string, VehicleCategory> = {
  Luxury: 'Luxury',
  SUV: 'SUV',
  Sedan: 'Sedan',
  'Van & Group': 'VanAndGroup',
  Compact: 'Compact',
  Economy: 'Economy',
  'Pick-up': 'PickUp',
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    dto: ListVehiclesDto = {},
  ): Promise<{ data: VehicleModelDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const category = dto.category ? LABEL_TO_CATEGORY[dto.category] : undefined;

    const where = {
      isPublished: true,
      ...(category ? { category } : {}),
    };

    const [models, total] = await this.prisma.$transaction([
      this.prisma.vehicleModel.findMany({
        where,
        orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicleModel.count({ where }),
    ]);

    return {
      data: models.map(toVehicleDto),
      meta: { page, limit, total },
    };
  }

  async getBySlug(dto: GetVehicleDto): Promise<VehicleModelDto> {
    const model = await this.prisma.vehicleModel.findFirst({
      where: { slug: dto.slug, isPublished: true },
    });

    if (!model) {
      throw new RpcException({
        code: 'VEHICLE_NOT_FOUND',
        message: 'Vehicle not found',
        status: 404,
      });
    }

    return toVehicleDto(model);
  }

  /** Staff list — includes unpublished drafts. */
  async listAdmin(
    dto: ListVehiclesAdminDto = {},
  ): Promise<{ data: VehicleModelDto[]; meta: PaginationMetaDto }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const category = dto.category ? LABEL_TO_CATEGORY[dto.category] : undefined;

    const where = {
      ...(category ? { category } : {}),
      ...(typeof dto.isPublished === 'boolean' ? { isPublished: dto.isPublished } : {}),
    };

    const [models, total] = await this.prisma.$transaction([
      this.prisma.vehicleModel.findMany({
        where,
        orderBy: [{ isPublished: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicleModel.count({ where }),
    ]);

    return {
      data: models.map(toVehicleDto),
      meta: { page, limit, total },
    };
  }

  /** Staff get by slug — includes unpublished drafts. */
  async getAdminBySlug(dto: GetVehicleDto): Promise<VehicleModelDto> {
    const model = await this.prisma.vehicleModel.findFirst({
      where: { slug: dto.slug },
    });

    if (!model) {
      throw new RpcException({
        code: 'VEHICLE_NOT_FOUND',
        message: 'Vehicle not found',
        status: 404,
      });
    }

    return toVehicleDto(model);
  }

  async upsert(dto: UpsertVehicleDto): Promise<VehicleModelDto> {
    const category = LABEL_TO_CATEGORY[dto.category];
    if (!category) {
      throw new RpcException({
        code: 'VALIDATION_ERROR',
        message: 'Invalid vehicle category',
        status: 400,
      });
    }

    if (dto.defaultHubId) {
      const hub = await this.prisma.hub.findUnique({ where: { id: dto.defaultHubId } });
      if (!hub) {
        throw new RpcException({
          code: 'HUB_NOT_FOUND',
          message: 'Default hub not found',
          status: 400,
        });
      }
    }

    const data = {
      name: dto.name,
      category,
      tier: dto.tier as VehicleTier,
      seats: dto.seats,
      bags: dto.bags,
      transmission: dto.transmission as Transmission,
      imageKey: dto.imageKey,
      baseDailyPriceTnd: dto.baseDailyPriceTnd,
      defaultHubId: dto.defaultHubId ?? null,
      isPublished: dto.isPublished,
    };

    const model = await this.prisma.vehicleModel.upsert({
      where: { slug: dto.slug },
      create: { slug: dto.slug, ...data },
      update: data,
    });

    return toVehicleDto(model);
  }
}

function toVehicleDto(model: VehicleModel): VehicleModelDto {
  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    category: CATEGORY_TO_LABEL[model.category],
    tier: model.tier,
    seats: model.seats,
    bags: model.bags,
    transmission: model.transmission,
    imageKey: model.imageKey,
    baseDailyPriceTnd: Number(model.baseDailyPriceTnd),
    defaultHubId: model.defaultHubId,
    isPublished: model.isPublished,
  };
}
