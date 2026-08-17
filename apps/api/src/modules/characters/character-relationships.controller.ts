import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CharactersService } from "./characters.service";
import { CreateCharacterRelationshipDto } from "./dto/create-character-relationship.dto";
import { UpdateCharacterRelationshipDto } from "./dto/update-character-relationship.dto";

@Controller("projects/:projectId/character-relationships")
export class CharacterRelationshipsController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.charactersService.listRelationships(projectId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateCharacterRelationshipDto,
  ) {
    return this.charactersService.createRelationship(projectId, dto);
  }

  @Get(":relationshipId")
  get(
    @Param("projectId") projectId: string,
    @Param("relationshipId") relationshipId: string,
  ) {
    return this.charactersService.getRelationship(projectId, relationshipId);
  }

  @Patch(":relationshipId")
  update(
    @Param("projectId") projectId: string,
    @Param("relationshipId") relationshipId: string,
    @Body() dto: UpdateCharacterRelationshipDto,
  ) {
    return this.charactersService.updateRelationship(
      projectId,
      relationshipId,
      dto,
    );
  }

  @Delete(":relationshipId")
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("relationshipId") relationshipId: string,
  ) {
    return this.charactersService.removeRelationship(projectId, relationshipId);
  }
}
