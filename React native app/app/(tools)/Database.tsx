import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet,StatusBar } from 'react-native';
import * as SQLite from 'expo-sqlite';

interface TableData {
  name: string;
  columns: string[];
  rows: any[];
}

interface TableName {
  name: string;
}

const db = SQLite.openDatabaseSync('mainapp.db');

export default function Database() {
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = () => {
    const stmt = db.prepareSync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    try {
      const results = stmt.executeSync();
      const tableNames = results.getAllSync() as TableName[];
      
      const tableData: TableData[] = [];
      
      for (const { name } of tableNames) {
        const dataStmt = db.prepareSync(`SELECT * FROM ${name}`);
        try {
          const dataResults = dataStmt.executeSync();
          const rows = dataResults.getAllSync() as Record<string, any>[];
          const columns = rows.length > 0 ? Object.keys(rows[0] as object) : [];
          
          tableData.push({
            name,
            columns,
            rows
          });
        } catch (error) {
          console.error(`Error loading data for table ${name}:`, error);
        } finally {
          dataStmt.finalizeSync();
        }
      }

      setTables(tableData);
      if (tableData.length > 0) {
        setSelectedTable(tableData[0].name);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const renderTableData = (table: TableData) => {
    return (
      <View style={styles.tableContainer}>
         <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Text style={styles.tableTitle}>{table.name}</Text>
        <ScrollView horizontal>
          <View>
            {/* Header Row */}
            <View style={styles.headerRow}>
              {table.columns.map((column, index) => (
                <View key={index} style={styles.headerCell}>
                  <Text style={styles.headerText}>{column}</Text>
                </View>
              ))}
            </View>
            
            {/* Data Rows */}
            <ScrollView style={styles.dataContainer}>
              {table.rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.row}>
                  {table.columns.map((column, colIndex) => (
                    <View key={colIndex} style={styles.cell}>
                      <Text style={styles.cellText}>
                        {row[column]?.toString() || 'null'}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.refreshButton} onPress={loadTables}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal style={styles.tabContainer}>
        {tables.map((table) => (
          <TouchableOpacity
            key={table.name}
            style={[
              styles.tab,
              selectedTable === table.name && styles.selectedTab
            ]}
            onPress={() => setSelectedTable(table.name)}
          >
            <Text style={styles.tabText}>{table.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {tables.find(t => t.name === selectedTable) &&
          renderTableData(tables.find(t => t.name === selectedTable)!)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  refreshButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
  },
  refreshButtonText: {
    color: '#fff',
  },
  tabContainer: {
    maxHeight: 50,
    backgroundColor: '#f5f5f5',
  },
  tab: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  selectedTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    color: '#000',
  },
  content: {
    flex: 1,
  },
  tableContainer: {
    margin: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerCell: {
    padding: 10,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerText: {
    fontWeight: 'bold',
  },
  dataContainer: {
    maxHeight: 400,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  cell: {
    padding: 10,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  cellText: {
    color: '#333',
  },
});