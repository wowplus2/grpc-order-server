import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { CreateOrderRequest, CreateOrderResponse } from './proto/order.pb';
import {
  DecreaseStockResponse,
  FindOneResponse,
  ProductServiceClient,
  PRODUCT_SERVICE_NAME,
} from './proto/product.pb';

@Injectable()
export class OrderService implements OnModuleInit {
  private productSvc: ProductServiceClient;

  @Inject(PRODUCT_SERVICE_NAME)
  private readonly client: ClientGrpc;

  @InjectRepository(Order)
  private readonly repository: Repository<Order>;

  public onModuleInit(): void {
    this.productSvc =
      this.client.getService<ProductServiceClient>(PRODUCT_SERVICE_NAME);
  }

  public async createOrder(
    data: CreateOrderRequest,
  ): Promise<CreateOrderResponse> {
    const product: FindOneResponse = await firstValueFrom(
      this.productSvc.findOne({ id: data.productId }),
    );
    if (product.status >= HttpStatus.NOT_FOUND) {
      return { status: product.status, error: ['Product no found.'], id: null };
    } else if (product.data.stock < data.quantity) {
      return {
        status: HttpStatus.CONFLICT,
        error: ['Stock too less.'],
        id: null,
      };
    }

    const order: Order = new Order();
    order.price = product.data.price;
    order.productId = product.data.id;
    order.userId = data.userId;

    await this.repository.save(order);

    const decreaseStockData: DecreaseStockResponse = await firstValueFrom(
      this.productSvc.decreaseStock({ id: data.productId, orderId: order.id }),
    );

    if (decreaseStockData.status === HttpStatus.CONFLICT) {
      // deleting order if decreaseStock fails
      await this.repository.delete(order);

      return {
        status: HttpStatus.CONFLICT,
        error: decreaseStockData.error,
        id: null,
      };
    }

    return { status: HttpStatus.OK, error: null, id: order.id };
  }
}
