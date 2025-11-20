import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CloudinaryService } from './services/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMyProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateDto);
  }

  @Put('me/home-court')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or remove home court' })
  @ApiResponse({ status: 200, description: 'Home court updated successfully' })
  async setHomeCourt(
    @CurrentUser() user: User,
    @Body() body: { courtId: string | null },
  ) {
    return this.usersService.setHomeCourt(user.id, body.courtId);
  }

  @Post('me/photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
  async uploadPhoto(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Upload to Cloudinary
    const { url } = await this.cloudinaryService.uploadImage(
      file.buffer,
      'courtmate/users',
      `user-${user.id}`,
    );

    // Update user profile
    return this.usersService.updateProfile(user.id, { photoUrl: url });
  }

  @Post('me/photo/base64')
  @ApiOperation({ summary: 'Upload profile photo from base64' })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
  async uploadPhotoFromBase64(
    @CurrentUser() user: User,
    @Body() body: { photo: string },
  ) {
    if (!body.photo) {
      throw new BadRequestException('No photo data provided');
    }

    // Upload to Cloudinary
    const { url } = await this.cloudinaryService.uploadImageFromBase64(
      body.photo,
      'courtmate/users',
      `user-${user.id}`,
    );

    // Update user profile
    return this.usersService.updateProfile(user.id, { photoUrl: url });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiResponse({ status: 200, description: 'Public user profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }
}

