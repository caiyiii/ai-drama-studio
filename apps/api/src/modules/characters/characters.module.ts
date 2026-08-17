import { Module } from "@nestjs/common";
import { CharactersController } from "./characters.controller";
import { CharacterRelationshipsController } from "./character-relationships.controller";
import { CharactersService } from "./characters.service";

@Module({
  controllers: [CharactersController, CharacterRelationshipsController],
  providers: [CharactersService],
})
export class CharactersModule {}
