import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CharactersService } from "./characters.service";
import { CreateCharacterDto } from "./dto/create-character.dto";
import { ListCharactersQueryDto } from "./dto/list-characters-query.dto";
import { UpdateCharacterDto } from "./dto/update-character.dto";

@Controller("projects/:projectId/characters")
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  list(
    @Param("projectId") projectId: string,
    @Query() query: ListCharactersQueryDto,
  ) {
    return this.charactersService.list(projectId, query);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateCharacterDto,
  ) {
    return this.charactersService.create(projectId, dto);
  }

  @Get(":characterId")
  get(
    @Param("projectId") projectId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.charactersService.get(projectId, characterId);
  }

  @Patch(":characterId")
  update(
    @Param("projectId") projectId: string,
    @Param("characterId") characterId: string,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.charactersService.update(projectId, characterId, dto);
  }

  @Delete(":characterId")
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.charactersService.remove(projectId, characterId);
  }
}
