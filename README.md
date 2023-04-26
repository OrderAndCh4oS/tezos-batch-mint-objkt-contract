Batch minting for Tezos

1. Set the `CONTRACT_ID` env variable, it's the contract id number, not the address, it can be found in the bigmap of the origination call on https://tzkt.io.


2. Set the token quantity

    ```ts
    const tokenQty: number = 1;
    ```

3. Set up the creators array
    ```ts
    // Note: The first address in creators should be the signed wallet.
    const creators: string[] = ["tz1xxxxxxxxxxxxxx"];
    ```

4. Set up the royalties
    ```ts
    const royalties: TzipRoyalties = {
        decimals: 4,
        shares: {
            "tz1xxxxxxxxxxxxx": 1000, // Note: 1000 = 10%
        }
    };
    ```

5. Set up your token data

   ```ts 
   const tokens: TokenData[] = [
       {
           image: 'an_image_in_the_files_dir.png',
           name: 'Image Title',
           description: "Enter a description",
           tags: ["Some", "Tags"],
           attributes: [
               {name: 'An Attr. Name', value: "The Value"},
           ],
           creators,
           royalties
       },
   ]
   ```
