import pandas as pd

filepath = 'rankings.csv'
cols_to_leave_alone = ['RK', 'POS', 'TIERS']
pos_strs = ['WR', 'RB', 'TE', 'QB', 'DST', 'K']

# Load overall file
rankings = pd.read_csv(filepath)

for current_pos in pos_strs:
    pos = pd.read_csv(f"{current_pos.lower()}.csv")

    # Create index mapping from [pos].csv
    pos_map = pos.set_index('RK')

    # Iterate through position rows in rankings
    for idx, row in rankings[rankings['POS'].str.startswith(current_pos)].iterrows():
        pos_rank = int(row['POS'].split(current_pos)[-1])  # e.g. QB1 -> 1
        if pos_rank in pos_map.index:
            pos_row = pos_map.loc[pos_rank]

            # Only update if the player name is different
            if row['PLAYER NAME'] != pos_row['PLAYER NAME']:
                for col in pos_row.index:
                    if col in rankings.columns and col not in cols_to_leave_alone:
                        rankings.at[idx, col] = pos_row[col]

# Save updated file
rankings.to_csv(filepath, index=False)
print(f'Updated file saved as {filepath}')
