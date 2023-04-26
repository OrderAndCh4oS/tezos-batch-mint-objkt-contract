import mintTokens, {TokenData, TzipRoyalties} from "./mint-tokens.ts";
import {config} from "dotenv";

config()

if (!process.env.TOKEN_ID) throw new Error('Missing TOKEN_ID')

const tokenId: number = Number(process.env.TOKEN_ID);
const tokenQty: number = 1;
// Note: The first address in creators should be the signed wallet.
const creators: string[] = ["tz1PwBHUVht6QmKWTd3fAAgx3BHM9RBjCLt2"];
const royalties: TzipRoyalties = {
    decimals: 4,
    shares: {
        "tz1PwBHUVht6QmKWTd3fAAgx3BHM9RBjCLt2": 100, // Note: 1000 = 10%
    }
};

const tokens: TokenData[] = [
    {
        image: 'put_images_in_files_dir_put_image_file_name_here',
        name: 'name_here',
        description: "description_here",
        tags: ["tags", "here"],
        attributes: [
            {name: 'name_here', value: "value_here"},
        ],
        creators,
        royalties
    },
]

await mintTokens(tokenId, tokenQty, creators, tokens);
