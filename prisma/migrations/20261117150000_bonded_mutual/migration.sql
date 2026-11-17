-- "Adopted together with" is a mutual pair stored once. Drop the reverse copy
-- where a pair was ticked from both cats' cards.
DELETE FROM "_Bonded" x
USING "_Bonded" y
WHERE y."A" = x."B" AND y."B" = x."A" AND x."A" > x."B";
