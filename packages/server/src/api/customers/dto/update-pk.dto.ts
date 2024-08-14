import { IsEnum, IsString, MinLength } from 'class-validator';
import { AttributeTypeName } from '../entities/attribute-type.entity';

export class UpdatePK_DTO {
  @MinLength(0)
  @IsString()
  key: string;

  @IsEnum(AttributeTypeName)
  type: AttributeTypeName;
}
