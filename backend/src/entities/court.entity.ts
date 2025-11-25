import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  DeleteDateColumn,
} from 'typeorm';
import type { Point } from 'geojson';
import { User } from './user.entity';
import { Match } from './match.entity';

export enum SurfaceType {
  HARD = 'hard',
  CLAY = 'clay',
  GRASS = 'grass',
  INDOOR = 'indoor',
}

@Entity('courts')
// Spatial index removed - requires PostGIS. Using regular index if needed.
@Index(['createdByUserId'])
export class Court {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({
    type: 'point',
    nullable: true,
    transformer: {
      to: (value: Point | null) => {
        if (!value || !value.coordinates) return null;
        // Convert GeoJSON Point to PostgreSQL point format: (lng, lat)
        return `(${value.coordinates[0]},${value.coordinates[1]})`;
      },
      from: (value: string | null) => {
        if (!value) return null;
        // Convert PostgreSQL point format to GeoJSON Point
        // Format: (lng,lat) or (lng, lat)
        const match = value.match(/\((-?\d+\.?\d*),(-?\d+\.?\d*)\)/);
        if (match) {
          return {
            type: 'Point',
            coordinates: [parseFloat(match[1]), parseFloat(match[2])],
          } as Point;
        }
        return null;
      },
    },
  })
  coordinates: Point;

  @Column({
    type: 'enum',
    enum: SurfaceType,
    name: 'surface_type',
  })
  surfaceType: SurfaceType;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'created_by_user_id' })
  createdByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Match, (match) => match.court)
  matches: Match[];

  @OneToMany(() => User, (user) => user.homeCourt)
  usersWithHomeCourt: User[];

  // Helper methods
  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}

